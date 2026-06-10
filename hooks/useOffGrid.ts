import { useState, useEffect, useCallback } from 'react';
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
  buildRagContext,
  type EngineStatus,
  type LlmResponse
} from '@/services/localLlmService';
import { Language } from '@/types/core';

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
  const [downloadedPacks, setDownloadedPacks] = useState<{ [key: string]: LocalPack }>({});
  const [updateAvailable, setUpdateAvailable] = useState<{ [key: string]: boolean }>({});
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});
  const [gemmaInstalled, setGemmaInstalled] = useState<boolean>(false);
  const [installingGemma, setInstallingGemma] = useState<boolean>(false);
  const [gemmaProgress, setGemmaProgress] = useState<number>(0);
  const [isWifi, setIsWifi] = useState<boolean>(true); // Default to true, updated dynamically
  const [storageEstimate, setStorageEstimate] = useState<StorageInfo>({ used: 0, total: 1024, percentage: 0 });
  const [sqlEngine, setSqlEngine] = useState<any>(null);
  const [packsMetadata, setPacksMetadata] = useState<{ [key: string]: { sizeBytes?: number } }>({});

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

  // Network: navigator.onLine + connection API (badge and download gating)
  useEffect(() => {
    const checkNetwork = () => {
      setIsWifi(navigator.onLine);
    };

    checkNetwork();
    window.addEventListener('online', checkNetwork);
    window.addEventListener('offline', checkNetwork);
    const conn =
      (navigator as Navigator & { connection?: EventTarget }).connection ||
      (navigator as Navigator & { mozConnection?: EventTarget }).mozConnection ||
      (navigator as Navigator & { webkitConnection?: EventTarget }).webkitConnection;
    conn?.addEventListener?.('change', checkNetwork);
    return () => {
      window.removeEventListener('online', checkNetwork);
      window.removeEventListener('offline', checkNetwork);
      conn?.removeEventListener?.('change', checkNetwork);
    };
  }, []);

  // Update storage estimate
  const updateStorageEstimate = useCallback(async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usedBytes = estimate.usage || 0;
        const totalBytes = estimate.quota || 1024 * 1024 * 1024; // Default 1GB

        // If Gemma is installed, let's simulate the 1.5GB (1536 MB) used in the UI
        const gemmaUsage = gemmaInstalled ? 1500 * 1024 * 1024 : 0;
        const finalUsed = usedBytes + gemmaUsage;
        const finalTotal = Math.max(totalBytes, finalUsed + 2000 * 1024 * 1024); // Ensure total is larger than used

        setStorageEstimate({
          used: Math.round(finalUsed / (1024 * 1024)),
          total: Math.round(finalTotal / (1024 * 1024)),
          percentage: Math.min(100, Math.round((finalUsed / finalTotal) * 100))
        });
      } else {
        // Fallback simulation
        const gemmaUsage = gemmaInstalled ? 1500 : 0;
        const packsUsage = Object.keys(downloadedPacks).length * 2.5; // ~2.5MB per pack
        const used = Math.round(50 + gemmaUsage + packsUsage);
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
      const flagged = localStorage.getItem('offgrid_gemma_installed') === 'true';
      if (!flagged) {
        setGemmaInstalled(false);
        return;
      }
      try {
        await Filesystem.stat({
          path: 'models/gemma4.bin',
          directory: Directory.Data,
        });
        setGemmaInstalled(true);
      } catch {
        localStorage.removeItem('offgrid_gemma_installed');
        setGemmaInstalled(false);
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

  // Subscribe to real-time metadata and updates check when network and packs are available
  useEffect(() => {
    if (!navigator.onLine) return;

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
  }, [downloadedPacks]);

  // Gemma 4 Install Simulation
  const installGemma = async () => {
    if (gemmaInstalled || installingGemma) return;
    if (!isWifi) {
      console.warn('[OffGrid] Gemma install blocked: Wi-Fi required');
      await LocalNotifications.schedule({
        notifications: [{
          title: 'Instalación Gemma 4',
          body: 'Conéctate a Wi-Fi para descargar el motor de chat (~1.5 GB).',
          id: getNotificationId('gemma4_wifi_required'),
          schedule: { at: new Date(Date.now() + 50) },
        }],
      }).catch(() => {});
      return;
    }

    setInstallingGemma(true);
    setGemmaProgress(0);
    
    const notifId = getNotificationId('gemma4_install');
    
    // Simulate download of 1.5GB model file in chunks
    const interval = setInterval(async () => {
      setGemmaProgress((prev) => {
        const next = prev + 5;
        
        // Update local notification progress
        LocalNotifications.schedule({
          notifications: [
            {
               title: 'Asistente de Viaje Gemma 4',
              body: `Instalando motor de inferencia local: ${next}%`,
              id: notifId,
              schedule: { at: new Date(Date.now() + 50) },
              ongoing: true
            }
          ]
        }).catch(err => console.warn(err));

        if (next >= 100) {
          clearInterval(interval);
          
          // Complete installation: Write a placeholder model file to the private sandbox
          Filesystem.writeFile({
            path: 'models/gemma4.bin',
            data: 'GEMMA_LOCAL_MODEL_PLACEHOLDER_1.5GB',
            directory: Directory.Data,
            encoding: Encoding.UTF8,
            recursive: true
          }).then(() => {
            localStorage.setItem('offgrid_gemma_installed', 'true');
            setGemmaInstalled(true);
            setInstallingGemma(false);
            
            // Success notification
            LocalNotifications.schedule({
              notifications: [
                {
                  title: 'Asistente de Viaje Gemma 4',
                  body: '¡Guía inteligente instalado y listo para su uso Off-Grid!',
                  id: notifId,
                  schedule: { at: new Date(Date.now() + 50) }
                }
              ]
            }).catch(err => console.warn(err));
          }).catch(err => {
            console.error("Error saving gemma file:", err);
            setInstallingGemma(false);
          });
          
          return 100;
        }
        return next;
      });
    }, 300);
  };

  // Gemma 4 Uninstall/Delete
  const uninstallGemma = async () => {
    try {
      // Remove model file from Capacitor Filesystem
      await Filesystem.deleteFile({
        path: 'models/gemma4.bin',
        directory: Directory.Data
      });
    } catch (e) {
      console.warn("[OffGrid] Model file did not exist or was already deleted:", e);
    }
    
    localStorage.removeItem('offgrid_gemma_installed');
    setGemmaInstalled(false);
    setGemmaProgress(0);
    
    // Notify user
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Espacio Liberado',
          body: 'El motor Gemma 4 (1.5 GB) ha sido desinstalado completamente.',
          id: getNotificationId('gemma4_uninstall'),
          schedule: { at: new Date(Date.now() + 50) }
        }
      ]
    });
  };

  // Download Department Pack
  const downloadPack = async (departmentId: string, departmentName: string) => {
    if (isDownloading[departmentId]) return;
    
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

      // 2. Prepare statement and run query
      const stmt = offlineDb.prepare(sqlQuery);
      stmt.bind(params);
      
      const results: any[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      
      stmt.free();
      offlineDb.close();
      
      return results;
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
    language: Language = Language.Spanish
  ): Promise<LlmResponse> => {
    const packLang: 'es' | 'en' = language === Language.English ? 'en' : 'es';

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
      eventResults
    );

    // 5. Generate response via the active engine
    const response = await localLlm.generateResponse(userQuery, ragContext, language);

    return response;
  };

  /**
   * Get the current engine status for UI indicators.
   */
  const getEngineStatus = (): EngineStatus => {
    return localLlm.getStatus();
  };

  /**
   * Initialize the local LLM engine (called once when entering the terminal).
   */
  const initializeEngine = async (): Promise<EngineStatus> => {
    return await localLlm.initialize();
  };

  return {
    downloadedPacks,
    updateAvailable,
    downloadProgress,
    isDownloading,
    gemmaInstalled,
    installingGemma,
    gemmaProgress,
    isWifi,
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
    getEngineStatus,
    initializeEngine
  };
};
