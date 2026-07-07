import { useState, useEffect, useCallback } from 'react';
import { useNetworkDetails } from './useNetworkDetails';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import axios from 'axios';
import { doc, getDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import {
  localLlm,
  buildProtocolSearchSQL,
  buildDestinationSearchSQL,
  buildRefugioSearchSQL,
  buildCouponSearchSQL,
  buildEventSearchSQL,
  buildDepartmentContextSQL,
  buildRagContext,
  type EngineStatus,
  type LlmResponse,
  toPackLang,
  searchVaultLocalCatalog,
  type VaultLocalSearchResult,
} from '@/services/localLlmService';
import { Language } from '@/types/core';
import {
  dismissPackLanguageAlert,
  shouldShowPackLanguageAlert,
  syncPackLanguageAlertAfterDownload,
  type PackLanguageAlertState,
} from '@/utils/offgridPackLanguageAlert';
import { GEMMA_CONFIG } from '@/config/gemma';
import {
  downloadGemmaModel,
  GemmaDownloadUrlMissingError,
  getGemmaModelSizeBytes,
  isGemmaModelReady,
  removeGemmaModel,
  cleanupPartialGemmaInstall,
} from '@/services/gemmaModelStore';
import type { GemmaDownloadProgress } from '@/services/gemmaModelStore';
import {
  GEMMA_INSTALL_PROGRESS,
  GEMMA_INSTALL_STALL_MS,
  GEMMA_INSTALL_TOTAL_TIMEOUT_MS,
  mapStreamProgressToOverall,
  mapArchiveDownloadToOverall,
  mapArchiveWriteToOverall,
} from '@/utils/gemmaInstallProgress';

/** UI-facing install lifecycle for the Gemma engine card. */
export type GemmaInstallPhase =
  | 'idle'
  | 'streaming'
  | 'downloading'
  | 'extracting'
  | 'finalizing'
  | 'verifying'
  | 'installed';

// Helper to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Simple string hash function to generate unique numbers for local notifications
function getNotificationId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 100000;
}

export interface LocalPack {
  version: number;
  size: string;
  downloadedAt: string;
}

export interface StorageInfo {
  used: number; // in MB
  total: number; // in MB
  percentage: number;
}

export const useOffGrid = () => {
  const network = useNetworkDetails();
  const [downloadedPacks, setDownloadedPacks] = useState<{ [key: string]: LocalPack }>({});
  const [updateAvailable, setUpdateAvailable] = useState<{ [key: string]: boolean }>({});
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});
  const [gemmaInstalled, setGemmaInstalled] = useState<boolean>(false);
  const [installingGemma, setInstallingGemma] = useState<boolean>(false);
  const [gemmaProgress, setGemmaProgress] = useState<number>(0);
  const [gemmaPhase, setGemmaPhase] = useState<GemmaInstallPhase>('idle');
  const [gemmaPhaseProgress, setGemmaPhaseProgress] = useState<number>(0);
  const [gemmaWriteSavedMb, setGemmaWriteSavedMb] = useState<number>(0);
  const [gemmaInstallError, setGemmaInstallError] = useState<string | null>(null);
  const [gemmaInstallElapsedSec, setGemmaInstallElapsedSec] = useState<number>(0);
  const [uninstallingGemma, setUninstallingGemma] = useState<boolean>(false);
  const [gemmaUninstallProgress, setGemmaUninstallProgress] = useState<number>(0);
  const [gemmaUninstallDone, setGemmaUninstallDone] = useState<boolean>(false);
  const [storageEstimate, setStorageEstimate] = useState<StorageInfo>({ used: 0, total: 1024, percentage: 0 });
  const [sqlEngine, setSqlEngine] = useState<any>(null);
  const [packsMetadata, setPacksMetadata] = useState<{ [key: string]: { sizeBytes?: number } }>({});
  const [packLanguageAlert, setPackLanguageAlert] = useState<PackLanguageAlertState | null>(null);

  // Initialize sql.js
  useEffect(() => {
    const initSql = async () => {
      try {
        // Load initSqlJs dynamically
        const initSqlJs = (window as any).initSqlJs || (await import('sql.js')).default;
        const SQL = await initSqlJs({
          locateFile: (file: string) => `/sql-wasm.wasm`
        });
        setSqlEngine(SQL);
        console.log("[OffGrid] SQLite (sql.js) Engine loaded successfully");
      } catch (err) {
        console.error("[OffGrid] Failed to load SQL.js engine:", err);
      }
    };
    initSql();
  }, []);

  // Update storage estimate
  const updateStorageEstimate = useCallback(async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usedBytes = estimate.usage || 0;
        const totalBytes = estimate.quota || 1024 * 1024 * 1024; // Default 1GB

        const gemmaBytes = gemmaInstalled ? await getGemmaModelSizeBytes() : 0;
        const finalUsed = usedBytes + gemmaBytes;
        const finalTotal = Math.max(totalBytes, finalUsed + 2000 * 1024 * 1024); // Ensure total is larger than used

        setStorageEstimate({
          used: Math.round(finalUsed / (1024 * 1024)),
          total: Math.round(finalTotal / (1024 * 1024)),
          percentage: Math.min(100, Math.round((finalUsed / finalTotal) * 100))
        });
      } else {
        // Fallback simulation
        const gemmaMb = gemmaInstalled
          ? Math.round((await getGemmaModelSizeBytes()) / (1024 * 1024)) || GEMMA_CONFIG.approxSizeMb
          : 0;
        const packsUsage = Object.keys(downloadedPacks).length * 2.5; // ~2.5MB per pack
        const used = Math.round(50 + gemmaMb + packsUsage);
        setStorageEstimate({
          used,
          total: 8192, // 8GB simulated total
          percentage: Math.round((used / 8192) * 100)
        });
      }
    } catch (error) {
      console.error("[OffGrid] Storage estimate error:", error);
    }
  }, [gemmaInstalled, downloadedPacks]);

  // Load state on mount
  useEffect(() => {
    const syncGemmaInstallState = async () => {
      const ready = await isGemmaModelReady();
      setGemmaInstalled(ready);
      if (!ready) {
        localStorage.removeItem(GEMMA_CONFIG.storageKey);
        await cleanupPartialGemmaInstall();
      }
    };
    syncGemmaInstallState();

    // Load downloaded packs from localStorage
    const savedPacks = localStorage.getItem('offgrid_downloaded_packs');
    if (savedPacks) {
      setDownloadedPacks(JSON.parse(savedPacks));
    }

    // Load packsMetadata from localStorage
    const savedMeta = localStorage.getItem('offgrid_packs_metadata');
    if (savedMeta) {
      setPacksMetadata(JSON.parse(savedMeta));
    }

    // Request Notification Permissions on mount
    LocalNotifications.requestPermissions().catch(err => {
      console.warn("Notification permissions rejected:", err);
    });
  }, []);

  // Update storage estimate when dependencies change
  useEffect(() => {
    updateStorageEstimate();
  }, [gemmaInstalled, downloadedPacks, updateStorageEstimate]);

  useEffect(() => {
    setPackLanguageAlert(shouldShowPackLanguageAlert(downloadedPacks));
  }, [downloadedPacks]);

  // Verify updates comparing timestamps
  const checkUpdates = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      console.log("[OffGrid] Checking for updates...");
      const querySnapshot = await getDocs(collection(db, 'department_packs'));
      const updatesMap: { [key: string]: boolean } = {};
      const metaMap: { [key: string]: { sizeBytes?: number } } = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const deptId = doc.id;
        const localPack = downloadedPacks[deptId];
        
        metaMap[deptId] = {
          sizeBytes: data.sizeBytes
        };
        
        if (localPack && data.lastUpdated) {
          const remoteTime = typeof data.lastUpdated.toDate === 'function' 
            ? data.lastUpdated.toDate().getTime() 
            : new Date(data.lastUpdated).getTime();
            
          if (localPack.version < remoteTime) {
            updatesMap[deptId] = true;
          }
        }
      });

      setPacksMetadata(metaMap);
      localStorage.setItem('offgrid_packs_metadata', JSON.stringify(metaMap));
      setUpdateAvailable(updatesMap);
    } catch (err) {
      console.error("[OffGrid] Error checking updates:", err);
    }
  }, [downloadedPacks]);

  // Subscribe to real-time metadata and updates check when network and packs are available.
  // Depend on network.isOnline so the listener is (re)established after reconnecting,
  // even if the vault was first opened while offline.
  useEffect(() => {
    if (!network.isOnline) return;

    console.log("[OffGrid] Subscribing to real-time updates for department_packs...");
    const unsubscribe = onSnapshot(collection(db, 'department_packs'), (querySnapshot) => {
      const updatesMap: { [key: string]: boolean } = {};
      const metaMap: { [key: string]: { sizeBytes?: number } } = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const deptId = doc.id;
        const localPack = downloadedPacks[deptId];
        
        metaMap[deptId] = {
          sizeBytes: data.sizeBytes
        };
        
        if (localPack && data.lastUpdated) {
          const remoteTime = typeof data.lastUpdated.toDate === 'function' 
            ? data.lastUpdated.toDate().getTime() 
            : new Date(data.lastUpdated).getTime();
            
          if (localPack.version < remoteTime) {
            updatesMap[deptId] = true;
          }
        }
      });

      setPacksMetadata(metaMap);
      localStorage.setItem('offgrid_packs_metadata', JSON.stringify(metaMap));
      setUpdateAvailable(updatesMap);
    }, (err) => {
      console.error("[OffGrid] Real-time updates subscription error:", err);
    });

    return () => unsubscribe();
  }, [downloadedPacks, network.isOnline]);

  useEffect(() => {
    if (!installingGemma) {
      setGemmaInstallElapsedSec(0);
      return;
    }
    const startedAt = Date.now();
    const tick = setInterval(() => {
      setGemmaInstallElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [installingGemma]);

  const applyGemmaDownloadProgress = (progress: GemmaDownloadProgress) => {
    const { phase, phasePercent, savedMb } = progress;
    setGemmaPhaseProgress(phasePercent);

    const fallbackSavedMb = Math.round((phasePercent / 100) * GEMMA_CONFIG.approxSizeMb);
    const resolvedSavedMb = savedMb ?? fallbackSavedMb;

    if (phase === 'streaming') {
      setGemmaPhase('streaming');
      setGemmaProgress(mapStreamProgressToOverall(phasePercent));
      setGemmaWriteSavedMb(resolvedSavedMb);
      return;
    }
    if (phase === 'downloading') {
      setGemmaPhase('downloading');
      setGemmaProgress(mapArchiveDownloadToOverall(phasePercent));
      setGemmaWriteSavedMb(resolvedSavedMb);
      return;
    }
    if (phase === 'extracting') {
      setGemmaPhase('extracting');
      setGemmaProgress(GEMMA_INSTALL_PROGRESS.archiveDownloadEnd + 2);
      return;
    }
    setGemmaPhase('finalizing');
    setGemmaProgress(mapArchiveWriteToOverall(phasePercent));
    setGemmaWriteSavedMb(resolvedSavedMb);
  };

  // Gemma — real MediaPipe model download + on-device inference
  const installGemma = async () => {
    if (gemmaInstalled || installingGemma) return;
    if (!network.isOnline) return;
    if (!network.isWifi) {
      console.warn('[OffGrid] Gemma install blocked: Wi-Fi required');
      await LocalNotifications.schedule({
        notifications: [{
          title: 'Instalación Gemma',
          body: 'Conéctate a Wi-Fi para descargar el motor de chat (~1.29 GB).',
          id: getNotificationId('gemma4_wifi_required'),
          schedule: { at: new Date(Date.now() + 50) },
        }],
      }).catch(() => {});
      return;
    }

    setInstallingGemma(true);
    setGemmaProgress(0);
    setGemmaPhaseProgress(0);
    setGemmaWriteSavedMb(0);
    setGemmaPhase('downloading');
    setGemmaInstallError(null);

    const notifId = getNotificationId('gemma4_install');
    const abortController = new AbortController();
    let abortReason: 'stall' | 'total' | null = null;
    let lastProgressAt = Date.now();

    const stallWatchdog = setInterval(() => {
      if (Date.now() - lastProgressAt > GEMMA_INSTALL_STALL_MS) {
        abortReason = 'stall';
        abortController.abort();
      }
    }, 5000);

    const totalTimeout = setTimeout(() => {
      abortReason = 'total';
      abortController.abort();
    }, GEMMA_INSTALL_TOTAL_TIMEOUT_MS);

    const touchProgress = () => {
      lastProgressAt = Date.now();
    };

    // Throttle the ongoing notification so we only re-schedule when the
    // integer percent (per phase) changes — avoids hundreds of schedules/sec.
    let lastNotifiedKey = '';
    const updateOngoingNotification = (title: string, body: string, key: string) => {
      if (key === lastNotifiedKey) return;
      lastNotifiedKey = key;
      LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: notifId,
          schedule: { at: new Date(Date.now() + 50) },
          ongoing: true,
        }],
      }).catch(() => {});
    };

    try {
      await downloadGemmaModel(
        (progress) => {
          touchProgress();
          applyGemmaDownloadProgress(progress);
          if (progress.phase === 'streaming') {
            updateOngoingNotification(
              'Motor Gemma (MediaPipe)',
              `Descargando y guardando: ${progress.phasePercent}%`,
              `s${progress.phasePercent}`
            );
          } else if (progress.phase === 'downloading') {
            updateOngoingNotification(
              'Motor Gemma (MediaPipe)',
              `Descargando: ${progress.phasePercent}%`,
              `d${progress.phasePercent}`
            );
          } else if (progress.phase === 'finalizing') {
            updateOngoingNotification(
              'Motor Gemma (MediaPipe)',
              `Guardando en disco: ${progress.phasePercent}%`,
              `f${progress.phasePercent}`
            );
          }
        },
        (phase) => {
          if (phase === 'streaming') {
            setGemmaPhase('streaming');
          } else if (phase === 'finalizing') {
            setGemmaPhase('finalizing');
          } else if (phase === 'extracting') {
            setGemmaPhase('extracting');
          }
        },
        abortController.signal
      );

      setGemmaPhase('verifying');
      setGemmaPhaseProgress(0);
      setGemmaProgress(GEMMA_INSTALL_PROGRESS.verifyStart);
      touchProgress();

      const verified = await isGemmaModelReady();
      if (!verified) {
        throw new Error('GEMMA_VERIFY_FAILED');
      }

      setGemmaProgress(GEMMA_INSTALL_PROGRESS.verifyMid);
      touchProgress();
      await localLlm.initialize({ preferGemma: true });

      setGemmaInstalled(true);
      setGemmaPhase('installed');
      setGemmaProgress(GEMMA_INSTALL_PROGRESS.complete);
      await updateStorageEstimate();

      await LocalNotifications.schedule({
        notifications: [{
          title: 'Motor Gemma instalado ✓',
          body: 'Instalación verificada. El chat offline ya responde de forma conversacional (con WebGPU).',
          id: notifId,
          schedule: { at: new Date(Date.now() + 50) },
        }],
      }).catch(() => {});
    } catch (err) {
      console.error('[OffGrid] Gemma install failed:', err);
      await cleanupPartialGemmaInstall();
      setGemmaInstalled(false);
      setGemmaPhase('idle');
      setGemmaProgress(0);
      setGemmaPhaseProgress(0);
      setGemmaWriteSavedMb(0);

      const isAbort =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (axios.isCancel?.(err) ?? false) ||
        (err instanceof Error && err.message === 'GEMMA_INSTALL_ABORTED');

      const body =
        isAbort && abortReason === 'stall'
          ? 'La instalación dejó de avanzar. Comprueba espacio libre y Wi‑Fi, luego inténtalo de nuevo.'
          : isAbort && abortReason === 'total'
            ? 'La instalación superó el tiempo máximo. Usa Wi‑Fi estable y vuelve a intentarlo.'
            : err instanceof GemmaDownloadUrlMissingError
              ? 'Falta configurar la URL del modelo (Firestore config/gemmaModel o VITE_GEMMA_MODEL_URL).'
              : err instanceof Error && err.message === 'GEMMA_MODEL_TOO_SMALL'
                ? 'El archivo descargado no es un modelo válido.'
                : err instanceof Error && err.message === 'GEMMA_BIN_NOT_FOUND_IN_ARCHIVE'
                  ? 'El archivo comprimido no contiene el modelo .bin esperado.'
                  : err instanceof Error && err.message === 'GEMMA_VERIFY_FAILED'
                    ? 'No se pudo verificar el modelo tras la instalación. Inténtalo de nuevo.'
                    : err instanceof Error && err.message.startsWith('GEMMA_DOWNLOAD_HTTP_')
                      ? `El servidor rechazó la descarga (${err.message.replace('GEMMA_DOWNLOAD_HTTP_', 'HTTP ')}). Inténtalo más tarde.`
                      : 'No se pudo instalar el motor Gemma. Revisa tu conexión e inténtalo de nuevo.';

      setGemmaInstallError(body);

      // Reuse notifId (non-ongoing) so the stuck "ongoing" progress
      // notification is replaced rather than leaking in the tray.
      await LocalNotifications.schedule({
        notifications: [{
          title: 'Error al instalar Gemma',
          body,
          id: notifId,
          schedule: { at: new Date(Date.now() + 50) },
          ongoing: false,
        }],
      }).catch(() => {});
    } finally {
      clearInterval(stallWatchdog);
      clearTimeout(totalTimeout);
      setInstallingGemma(false);
    }
  };

  const uninstallGemma = async () => {
    if (uninstallingGemma) return;

    const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    setUninstallingGemma(true);
    setGemmaUninstallDone(false);
    setGemmaUninstallProgress(0);
    setGemmaInstallError(null);

    try {
      // Step 1 — release the engine from memory.
      setGemmaUninstallProgress(15);
      await localLlm.dispose();
      await delay(200);

      // Step 2 — delete model files (per-file progress mapped to 40–90%).
      setGemmaUninstallProgress(40);
      await removeGemmaModel((deleted, total) => {
        const pct = total > 0 ? 40 + Math.round((deleted / total) * 50) : 90;
        setGemmaUninstallProgress(pct);
      });
      await delay(200);

      // Step 3 — verify the model is really gone before declaring success.
      setGemmaUninstallProgress(95);
      let remaining = await getGemmaModelSizeBytes();
      if (remaining > 0) {
        await removeGemmaModel();
        remaining = await getGemmaModelSizeBytes();
      }
      if (remaining > 0) {
        throw new Error('GEMMA_UNINSTALL_INCOMPLETE');
      }

      // Step 4 — show 100% briefly so the user is sure it finished.
      setGemmaUninstallProgress(100);
      setGemmaUninstallDone(true);
      await delay(700);

      setGemmaInstalled(false);
      setGemmaProgress(0);
      setGemmaPhase('idle');
      await updateStorageEstimate();

      await LocalNotifications.schedule({
        notifications: [{
          title: 'Espacio liberado',
          body: 'El motor Gemma local ha sido desinstalado por completo.',
          id: getNotificationId('gemma4_uninstall'),
          schedule: { at: new Date(Date.now() + 50) },
        }],
      }).catch(() => {});
    } catch (err) {
      console.error('[OffGrid] Gemma uninstall failed:', err);
      setGemmaInstallError(
        'No se pudo desinstalar el motor por completo. Cierra y reabre la app, luego inténtalo de nuevo.'
      );
      await updateStorageEstimate();
    } finally {
      setUninstallingGemma(false);
      setGemmaUninstallProgress(0);
      setGemmaUninstallDone(false);
    }
  };

  // Download Department Pack
  const downloadPack = async (departmentId: string, departmentName: string) => {
    if (isDownloading[departmentId] || !network.isOnline) return;
    
    setIsDownloading(prev => ({ ...prev, [departmentId]: true }));
    setDownloadProgress(prev => ({ ...prev, [departmentId]: 0 }));
    
    const notifId = getNotificationId(`download_${departmentId}`);
    
    try {
      // 1. Fetch package registry metadata from Firestore
      const packDocRef = doc(db, 'department_packs', departmentId);
      const packDoc = await getDoc(packDocRef);
      
      if (!packDoc.exists()) {
        throw new Error(`No se encontró el paquete off-grid para el departamento: ${departmentName}`);
      }
      
      const packData = packDoc.data();
      const downloadUrl = packData.downloadUrl;
      const remoteVersion = typeof packData.lastUpdated.toDate === 'function'
        ? packData.lastUpdated.toDate().getTime()
        : new Date(packData.lastUpdated).getTime();
        
      if (!downloadUrl) {
        throw new Error(`El pack de ${departmentName} no cuenta con URL de descarga.`);
      }

      // 2. Download file using Axios streams/arraybuffer
      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        onDownloadProgress: (progressEvent) => {
          const total = progressEvent.total || 0;
          const current = progressEvent.loaded;
          const progress = total > 0 ? Math.round((current / total) * 100) : 0;
          
          setDownloadProgress(prev => ({ ...prev, [departmentId]: progress }));
          
          // Update notification
          LocalNotifications.schedule({
            notifications: [
              {
                title: 'Bóveda Off-Grid',
                body: `Descargando Pack de ${departmentName}: ${progress}%`,
                id: notifId,
                schedule: { at: new Date(Date.now() + 50) },
                ongoing: true
              }
            ]
          }).catch(err => console.warn(err));
        }
      });

      // Convert array buffer to base64
      const base64Data = arrayBufferToBase64(response.data);

      // 3. Write to temporary file first (Resilience)
      const tempPath = `packs/${departmentId}.tmp`;
      const finalPath = `packs/${departmentId}.db`;

      await Filesystem.writeFile({
        path: tempPath,
        data: base64Data,
        directory: Directory.Data,
        recursive: true
      });

      // Rename from .tmp to .db on complete success
      await Filesystem.rename({
        from: tempPath,
        to: finalPath,
        directory: Directory.Data
      });

      // 4. Update state and registry
      const sizeMB = (response.data.byteLength / (1024 * 1024)).toFixed(1) + ' MB';
      const newPack: LocalPack = {
        version: remoteVersion,
        size: sizeMB,
        downloadedAt: new Date().toISOString()
      };

      const updatedPacks = { ...downloadedPacks, [departmentId]: newPack };
      setDownloadedPacks(updatedPacks);
      localStorage.setItem('offgrid_downloaded_packs', JSON.stringify(updatedPacks));
      syncPackLanguageAlertAfterDownload(updatedPacks);
      setPackLanguageAlert(shouldShowPackLanguageAlert(updatedPacks));

      // Clear update badge
      setUpdateAvailable(prev => ({ ...prev, [departmentId]: false }));

      // Complete Notification
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Bóveda Off-Grid',
            body: `¡Pack de ${departmentName} (${sizeMB}) guardado exitosamente!`,
            id: notifId,
            schedule: { at: new Date(Date.now() + 50) }
          }
        ]
      });

    } catch (err: any) {
      console.error(`[OffGrid] Download failed for ${departmentName}:`, err);
      
      // Clean up temporal file if failed
      try {
        await Filesystem.deleteFile({
          path: `packs/${departmentId}.tmp`,
          directory: Directory.Data
        });
      } catch (e) {}

      // Failure Notification
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Error de Descarga',
            body: `No se pudo descargar el pack de ${departmentName}: ${err.message || 'Error de red'}`,
            id: notifId,
            schedule: { at: new Date(Date.now() + 50) }
          }
        ]
      });
    } finally {
      setIsDownloading(prev => ({ ...prev, [departmentId]: false }));
    }
  };

  // Delete Department Pack
  const deletePack = async (departmentId: string, departmentName: string) => {
    try {
      await Filesystem.deleteFile({
        path: `packs/${departmentId}.db`,
        directory: Directory.Data
      });
    } catch (err) {
      console.warn(`[OffGrid] Error deleting database file for ${departmentId}:`, err);
    }

    const updatedPacks = { ...downloadedPacks };
    delete updatedPacks[departmentId];
    setDownloadedPacks(updatedPacks);
    localStorage.setItem('offgrid_downloaded_packs', JSON.stringify(updatedPacks));
    
    // Notify
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Pack Eliminado',
          body: `El pack de ${departmentName} ha sido eliminado localmente.`,
          id: getNotificationId(`delete_${departmentId}`),
          schedule: { at: new Date(Date.now() + 50) }
        }
      ]
    });
  };

  // Offline Querying using sql.js
  const queryOffline = async (departmentId: string, sqlQuery: string, params: any[] = []): Promise<any[]> => {
    if (!sqlEngine) {
      throw new Error("El motor SQLite no está cargado todavía.");
    }
    
    try {
      // 1. Read binary file from Sandbox
      const fileResult = await Filesystem.readFile({
        path: `packs/${departmentId}.db`,
        directory: Directory.Data
      });

      if (!fileResult.data) {
        throw new Error("Base de datos offline vacía o no encontrada.");
      }

      // Convert base64 file content to Uint8Array and open db
      const dbData = base64ToUint8Array(fileResult.data as string);
      const offlineDb = new sqlEngine.Database(dbData);

      // 2. Prepare statement and run query — always release the connection,
      // even if prepare/bind/step throws, to avoid leaking sql.js memory.
      try {
        const stmt = offlineDb.prepare(sqlQuery);
        try {
          stmt.bind(params);

          const results: any[] = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          return results;
        } finally {
          stmt.free();
        }
      } finally {
        offlineDb.close();
      }
    } catch (err) {
      console.error("[OffGrid] Offline query failed:", err);
      throw err;
    }
  };

  // ─── Offline RAG Pipeline ──────────────────────────────────────────────────

  /**
   * Executes the full offline RAG pipeline:
   * 1. Queries local SQLite for protocols, destinations & refugios (LIMIT 3 each)
   * 2. Builds context with 2000 char safety cap
   * 3. Routes through the local LLM engine (Gemma or fallback)
   */
  const executeOfflineRag = async (
    departmentId: string,
    userQuery: string,
    language: Language = Language.Spanish,
    onPartial?: (chunk: string) => void
  ): Promise<LlmResponse> => {
    const packLang = toPackLang(language);

    // 0. Department briefing (single row; optional in legacy packs)
    let departmentRow: Record<string, unknown> | null = null;
    try {
      const deptSQL = buildDepartmentContextSQL(packLang);
      const deptRows = await queryOffline(departmentId, deptSQL.sql, deptSQL.params);
      if (deptRows.length > 0) departmentRow = deptRows[0];
    } catch (err) {
      console.warn('[OffGrid RAG] Department context unavailable:', err);
    }

    // 1. Search protocols
    const protocolSQL = buildProtocolSearchSQL(userQuery, packLang);
    let protocolResults: any[] = [];
    try {
      protocolResults = await queryOffline(departmentId, protocolSQL.sql, protocolSQL.params);
    } catch (err) {
      console.warn('[OffGrid RAG] Protocol search failed:', err);
    }

    // 2. Search destinations
    const destSQL = buildDestinationSearchSQL(userQuery, packLang);
    let destResults: any[] = [];
    try {
      destResults = await queryOffline(departmentId, destSQL.sql, destSQL.params);
    } catch (err) {
      console.warn('[OffGrid RAG] Destination search failed:', err);
    }

    // 3. Search refugios
    const refugioSQL = buildRefugioSearchSQL(userQuery, packLang);
    let refugioResults: any[] = [];
    try {
      refugioResults = await queryOffline(departmentId, refugioSQL.sql, refugioSQL.params);
    } catch (err) {
      console.warn('[OffGrid RAG] Refugio search failed:', err);
    }

    // 4. Search coupons
    const couponSQL = buildCouponSearchSQL(userQuery, packLang);
    let couponResults: any[] = [];
    try {
      couponResults = await queryOffline(departmentId, couponSQL.sql, couponSQL.params);
    } catch (err) {
      console.warn('[OffGrid RAG] Coupon search failed:', err);
    }

    // 5. Search events
    const eventSQL = buildEventSearchSQL(userQuery, packLang);
    let eventResults: any[] = [];
    try {
      eventResults = await queryOffline(departmentId, eventSQL.sql, eventSQL.params);
    } catch (err) {
      console.warn('[OffGrid RAG] Event search failed:', err);
    }

    // 6. Build RAG context (auto-truncates to 2000 chars)
    const ragContext = buildRagContext(
      protocolResults,
      destResults,
      refugioResults,
      couponResults,
      eventResults,
      language,
      departmentRow
    );

    // 5. Generate response via the active engine
    const response = await localLlm.generateResponse(userQuery, ragContext, language, onPartial);

    return response;
  };

  /**
   * Paso 2 — bilingual local search across all tables in downloaded packs.
   */
  const searchLocalVault = useCallback(
    async (
      userQuery: string,
      language: Language,
      deptNames: Record<string, string>
    ): Promise<Array<VaultLocalSearchResult & { deptId: string; deptName: string }>> => {
      const downloadedDepts = Object.keys(downloadedPacks);
      const merged: Array<VaultLocalSearchResult & { deptId: string; deptName: string }> = [];

      for (const deptId of downloadedDepts) {
        const rows = await searchVaultLocalCatalog(userQuery, language, (sql, params) =>
          queryOffline(deptId, sql, params)
        );
        for (const row of rows) {
          merged.push({
            ...row,
            deptId,
            deptName: deptNames[deptId] || deptId,
          });
        }
      }

      return merged;
    },
    [downloadedPacks, queryOffline]
  );

  /**
   * Get the current engine status for UI indicators.
   */
  const getEngineStatus = (): EngineStatus => {
    return localLlm.getStatus();
  };

  /**
   * Initialize the local LLM engine (called once when entering the terminal).
   */
  const initializeEngine = useCallback(async (): Promise<EngineStatus> => {
    const modelReady = await isGemmaModelReady();
    const status = await localLlm.initialize({ preferGemma: modelReady });
    // Init invalidates the install when the model file is corrupt/incompatible,
    // so re-sync the UI flag to bring back the install option.
    if (modelReady) {
      const stillReady = await isGemmaModelReady();
      setGemmaInstalled(stillReady);
    }
    return status;
  }, []);

  return {
    downloadedPacks,
    updateAvailable,
    downloadProgress,
    isDownloading,
    gemmaInstalled,
    installingGemma,
    gemmaProgress,
    gemmaPhase,
    gemmaPhaseProgress,
    gemmaWriteSavedMb,
    gemmaInstallError,
    gemmaInstallElapsedSec,
    uninstallingGemma,
    gemmaUninstallProgress,
    gemmaUninstallDone,
    network,
    /** @deprecated use network.isOnline */
    isWifi: network.isOnline,
    storageEstimate,
    installGemma,
    uninstallGemma,
    downloadPack,
    deletePack,
    queryOffline,
    checkUpdates,
    updateStorageEstimate,
    packsMetadata,
    executeOfflineRag,
    searchLocalVault,
    getEngineStatus,
    initializeEngine,
    packLanguageAlert,
    dismissPackLanguageAlert: () => {
      dismissPackLanguageAlert();
      setPackLanguageAlert(null);
    },
  };
};
