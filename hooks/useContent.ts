import { useState, useEffect, useMemo } from 'react';
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    limit,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Department, Destination, AppEvent, Coupon, NewsArticle, Refugio } from '../types/content';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../types/core';
import { canonicalDepartmentId } from '../utils/departmentIdentity';
import {
    localizeCoupon,
    localizeDepartment,
    localizeDestination,
    localizeEvent,
    localizeNewsArticle,
    localizeRefugio,
} from '../utils/localizeCatalog';

function useLocalizedArray<T>(
    raw: T[],
    localizeFn: (row: Record<string, unknown>, lang: Language) => T
): T[] {
    const { currentLanguage } = useLanguage();
    return useMemo(
        () => raw.map((item) => localizeFn(item as Record<string, unknown>, currentLanguage)),
        [raw, currentLanguage, localizeFn]
    );
}

function useLocalizedItem<T>(
    raw: T | null,
    localizeFn: (row: Record<string, unknown>, lang: Language) => T
): T | null {
    const { currentLanguage } = useLanguage();
    return useMemo(
        () => (raw ? localizeFn(raw as Record<string, unknown>, currentLanguage) : null),
        [raw, currentLanguage, localizeFn]
    );
}

// --- DEPARTMENTS ---
export const useDepartments = () => {
    const [rawData, setRawData] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const data = useLocalizedArray(rawData, localizeDepartment);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'departments'));
                const depts: Department[] = querySnapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                } as Department));

                setRawData(depts);
            } catch (err: any) {
                console.error('Error fetching departments:', err);
                setError(err);
                setRawData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDepartments();
    }, []);

    return { data, loading, error };
};

/** Live destination counts per department (updates as Firestore docs change). */
export const useDestinationCounts = () => {
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'destinations'),
            (snapshot) => {
                const next: Record<string, number> = {};
                snapshot.docs.forEach((docSnap) => {
                    const rawDeptId = docSnap.data().departmentId;
                    if (typeof rawDeptId !== 'string' || !rawDeptId.trim()) return;
                    const key = canonicalDepartmentId(rawDeptId.trim());
                    next[key] = (next[key] ?? 0) + 1;
                });
                setCounts(next);
                setLoading(false);
            },
            (err) => {
                console.error('Error listening to destination counts:', err);
                setCounts({});
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { counts, loading };
};

export { resolveDestinationCount } from '../utils/departmentIdentity';

export const useDepartment = (id: string | undefined) => {
    const [rawData, setRawData] = useState<Department | null>(null);
    const [loading, setLoading] = useState(true);
    const data = useLocalizedItem(rawData, localizeDepartment);

    useEffect(() => {
        const fetchDepartment = async () => {
            if (!id) {
                setRawData(null);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const docSnap = await getDoc(doc(db, 'departments', id));

                if (docSnap.exists()) {
                    setRawData({ id: docSnap.id, ...docSnap.data() } as Department);
                    return;
                }

                const bySlug = await getDocs(
                    query(collection(db, 'departments'), where('departmentId', '==', id), limit(1))
                );
                if (!bySlug.empty) {
                    const found = bySlug.docs[0];
                    setRawData({ id: found.id, ...found.data() } as Department);
                } else {
                    setRawData(null);
                }
            } catch (err) {
                console.error(err);
                setRawData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchDepartment();
    }, [id]);

    return { data, loading };
};

// --- DESTINATIONS ---
export const useDestinations = (departmentId?: string) => {
    const [rawData, setRawData] = useState<Destination[]>([]);
    const [loading, setLoading] = useState(true);
    const data = useLocalizedArray(rawData, localizeDestination);

    useEffect(() => {
        const fetchDestinations = async () => {
            try {
                setLoading(true);
                let q = collection(db, 'destinations');

                const getUrl = (field: any) => {
                    if (!field) return '';
                    if (typeof field === 'string') return field;
                    if (Array.isArray(field) && field.length > 0) {
                        return field[0].downloadURL || field[0].url || '';
                    }
                    return '';
                };

                const getUrls = (field: any) => {
                    if (!field) return [];
                    if (Array.isArray(field)) {
                        return field.map((item: any) => item.downloadURL || item.url || (typeof item === 'string' ? item : '')).filter(Boolean);
                    }
                    if (typeof field === 'string') return [field];
                    return [];
                };

                if (departmentId) {
                    const qRef = query(collection(db, 'destinations'), where('departmentId', '==', departmentId));
                    const snapshot = await getDocs(qRef);
                    const dests = snapshot.docs.map(doc => {
                        const data = doc.data();
                        const images = getUrls(data.gallery || data.images || data.galleryImages);
                        const hero = getUrl(data.heroImage) || images[0] || '';
                        const coords = data.coordinates ? { lat: data.coordinates.latitude, lng: data.coordinates.longitude } : null;
                        const stats = data.stats || {};

                        return {
                            ...data,
                            id: doc.id,
                            customId: data.id || doc.id,
                            title: data.title || data.name || 'Sin título',
                            description: data.description || '',
                            location: data.location || '',
                            status: data.status === "Abierto" || data.status === true,
                            heroImage: hero,
                            galleryImages: images,
                            pdfFile: getUrl(data.pdf || data.pdfFile),
                            coordinates: coords,
                            stats: {
                                hiking: data.statsHiking || stats.hikingLevel || stats.hiking || data.hikingLevel || '--',
                                temp: data.statsTemp || data.statsTemperature || stats.temperature || stats.temp || data.temperature || '--',
                                signal: data.statsSignal || stats.signal || data.signal || '--'
                            },
                            activities: data.activities || []
                        } as any as Destination;
                    });
                    setRawData(dests);
                } else {
                    const snapshot = await getDocs(q);
                    const dests = snapshot.docs.map(doc => {
                        const data = doc.data();
                        const images = getUrls(data.gallery || data.images || data.galleryImages);
                        const hero = getUrl(data.heroImage) || images[0] || '';
                        const coords = data.coordinates ? { lat: data.coordinates.latitude, lng: data.coordinates.longitude } : null;
                        const stats = data.stats || {};

                        return {
                            ...data,
                            id: doc.id,
                            customId: data.id || doc.id,
                            title: data.title || data.name || 'Sin título',
                            description: data.description || '',
                            location: data.location || '',
                            status: data.status === "Abierto" || data.status === true,
                            heroImage: hero,
                            galleryImages: images,
                            pdfFile: getUrl(data.pdf || data.pdfFile),
                            coordinates: coords,
                            stats: {
                                hiking: data.statsHiking || stats.hikingLevel || stats.hiking || data.hikingLevel || '--',
                                temp: data.statsTemp || data.statsTemperature || stats.temperature || stats.temp || data.temperature || '--',
                                signal: data.statsSignal || stats.signal || data.signal || '--'
                            },
                            activities: data.activities || []
                        } as any as Destination;
                    });
                    setRawData(dests);
                }

            } catch (err) {
                console.error(err);
                setRawData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDestinations();
    }, [departmentId]);

    return { data, loading };
};

export const useDestination = (id: string | undefined) => {
    const [rawData, setRawData] = useState<Destination | null>(null);
    const [loading, setLoading] = useState(true);
    const data = useLocalizedItem(rawData, localizeDestination);

    useEffect(() => {
        if (!id) {
            setRawData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        const fetchDestination = async () => {
            try {
                const getUrl = (field: any) => {
                    if (!field) return '';
                    if (typeof field === 'string') return field;
                    if (Array.isArray(field) && field.length > 0) {
                        return field[0].downloadURL || field[0].url || '';
                    }
                    return '';
                };

                const getUrls = (field: any) => {
                    if (!field) return [];
                    if (Array.isArray(field)) {
                        return field.map((item: any) => item.downloadURL || item.url || (typeof item === 'string' ? item : '')).filter(Boolean);
                    }
                    if (typeof field === 'string') return [field];
                    return [];
                };

                const mapDestinationDoc = (docId: string, raw: Record<string, unknown>): Destination => {
                    const images = getUrls(raw.gallery || raw.images || raw.galleryImages);
                    const hero = getUrl(raw.heroImage) || images[0] || '';
                    const pdfFile = getUrl(raw.pdf || raw.pdfFile);
                    const coords = raw.coordinates
                        ? { lat: (raw.coordinates as { latitude: number }).latitude, lng: (raw.coordinates as { longitude: number }).longitude }
                        : null;
                    const stats = (raw.stats as Record<string, unknown>) || {};

                    return {
                        ...raw,
                        id: docId,
                        customId: raw.id || docId,
                        title: raw.title || raw.name || 'Sin título',
                        description: raw.description || '',
                        location: raw.location || '',
                        status: raw.status === 'Abierto' || raw.status === true,
                        heroImage: hero,
                        galleryImages: images,
                        pdfFile,
                        coordinates: coords,
                        stats: {
                            hiking: raw.statsHiking || stats.hikingLevel || stats.hiking || raw.hikingLevel || '--',
                            temp: raw.statsTemp || stats.temperature || stats.temp || raw.statsTemperature || raw.temperature || '--',
                            signal: raw.statsSignal || stats.signal || raw.signal || '--',
                        },
                        aiTip: raw.aiTip || '',
                        activities: raw.activities || [],
                        packingGuide: raw.packingGuide ?? raw.packingGuige,
                        packingGuide_en: raw.packingGuide_en ?? raw.packingGuige_en,
                        packingSummary: raw.packingSummary,
                        packingSummary_en: raw.packingSummary_en,
                    } as Destination;
                };

                const docRef = doc(db, 'destinations', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setRawData(mapDestinationDoc(docSnap.id, docSnap.data() as Record<string, unknown>));
                    return;
                }

                const byCustomId = await getDocs(
                    query(collection(db, 'destinations'), where('id', '==', id), limit(1))
                );
                if (!byCustomId.empty) {
                    const found = byCustomId.docs[0];
                    setRawData(mapDestinationDoc(found.id, found.data() as Record<string, unknown>));
                    return;
                }

                setRawData(null);
            } catch (err) {
                console.error(err);
                setRawData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchDestination();
    }, [id]);

    return { data, loading };
};

// --- EVENTS ---
export const useEvents = () => {
    const [rawData, setRawData] = useState<AppEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const data = useLocalizedArray(rawData, localizeEvent);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const getUrl = (field: any) => {
                    if (!field) return '';
                    if (typeof field === 'string') return field;
                    if (Array.isArray(field) && field.length > 0) {
                        return field[0].downloadURL || field[0].url || '';
                    }
                    return '';
                };

                const getUrls = (field: any) => {
                    if (!field) return [];
                    if (Array.isArray(field)) {
                        return field.map((item: any) => item.downloadURL || item.url || (typeof item === 'string' ? item : '')).filter(Boolean);
                    }
                    if (typeof field === 'string') return [field];
                    return [];
                };

                const q = query(collection(db, 'Events'));
                const snapshot = await getDocs(q);
                const events = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const images = getUrls(data.image || data.images || data.gallery);
                    const hero = getUrl(data.image) || images[0] || '';
                    const coords = data.coordinates ? { lat: data.coordinates.latitude, lng: data.coordinates.longitude } : null;

                    let dateStr = "TBA";
                    let begDateStr = "";

                    if (data.date) {
                        const d = typeof data.date.toDate === 'function' ? data.date.toDate() : new Date(data.date);
                        if (!isNaN(d.getTime())) {
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            dateStr = `${day}/${month}/${year}`;
                        } else if (typeof data.date === 'string') {
                            dateStr = data.date;
                        }
                    }

                    if (data.beginningDate) {
                        const d = typeof data.beginningDate.toDate === 'function' ? data.beginningDate.toDate() : new Date(data.beginningDate);
                        if (!isNaN(d.getTime())) {
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            begDateStr = `${day}/${month}/${year}`;
                        }
                    }

                    if (!begDateStr) begDateStr = dateStr;

                    return {
                        ...data,
                        id: doc.id,
                        name: data.name || 'Sin nombre',
                        subtitle: data.subtitle || '',
                        location: data.location || 'Sin ubicación',
                        image: hero,
                        images: images,
                        date: dateStr,
                        beginningDate: begDateStr,
                        coordinates: coords,
                        destinationId: data.destinationId || '',
                        departmentId: data.departmentId || '',
                        url: data.url || '',
                        priceType: data.priceType?.value || data.priceType || '',
                        tips: data.tips || ''
                    } as any as AppEvent;
                });
                setRawData(events);
            } catch (err) {
                console.error(err);
                setRawData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    return { data, loading };
};

export const useEvent = (id: string | undefined) => {
    const [rawData, setRawData] = useState<AppEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const data = useLocalizedItem(rawData, localizeEvent);

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) return;
            try {
                const getUrl = (field: any) => {
                    if (!field) return '';
                    if (typeof field === 'string') return field;
                    if (Array.isArray(field) && field.length > 0) {
                        return field[0].downloadURL || field[0].url || '';
                    }
                    return '';
                };

                const getUrls = (field: any) => {
                    if (!field) return [];
                    if (Array.isArray(field)) {
                        return field.map((item: any) => item.downloadURL || item.url || (typeof item === 'string' ? item : '')).filter(Boolean);
                    }
                    if (typeof field === 'string') return [field];
                    return [];
                };

                const docRef = doc(db, 'Events', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const images = getUrls(data.image || data.images || data.gallery);
                    const hero = getUrl(data.image) || images[0] || '';
                    const coords = data.coordinates ? { lat: data.coordinates.latitude, lng: data.coordinates.longitude } : null;

                    let dateStr = "TBA";
                    let begDateStr = "";

                    if (data.date) {
                        const d = typeof data.date.toDate === 'function' ? data.date.toDate() : new Date(data.date);
                        if (!isNaN(d.getTime())) {
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            dateStr = `${day}/${month}/${year}`;
                        } else if (typeof data.date === 'string') {
                            dateStr = data.date;
                        }
                    }

                    if (data.beginningDate) {
                        const d = typeof data.beginningDate.toDate === 'function' ? data.beginningDate.toDate() : new Date(data.beginningDate);
                        if (!isNaN(d.getTime())) {
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            begDateStr = `${day}/${month}/${year}`;
                        }
                    }

                    if (!begDateStr) begDateStr = dateStr;

                    setRawData({
                        ...data,
                        id: docSnap.id,
                        name: data.name || 'Sin nombre',
                        subtitle: data.subtitle || '',
                        location: data.location || 'Sin ubicación',
                        image: hero,
                        images: images,
                        date: dateStr,
                        beginningDate: begDateStr,
                        coordinates: coords,
                        destinationId: data.destinationId || '',
                        departmentId: data.departmentId || '',
                        url: data.url || '',
                        priceType: data.priceType?.value || data.priceType || '',
                        tips: data.tips || ''
                    } as any as AppEvent);
                } else {
                    setRawData(null);
                }
            } catch (err) {
                console.error(err);
                setRawData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    return { data, loading };
};

// --- COUPONS ---
export const useCoupons = () => {
    const [rawData, setRawData] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const data = useLocalizedArray(rawData, localizeCoupon);

    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'Coupons'));
                const coupons = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const images = Array.isArray(data.images) ? data.images.map((img: any) => img.downloadURL || img) : [];
                    const cat = Array.isArray(data.category) ? data.category[0] : data.category;
                    const coords = data.coordinates ? { lat: data.coordinates.latitude, lng: data.coordinates.longitude } : data.coordinates;

                    return {
                        ...data,
                        id: doc.id,
                        title: data.title || '',
                        coupon_code: data.coupon_code || data.couponCode,
                        image: data.image || images[0] || '',
                        images: images,
                        category: cat,
                        coordinates: coords
                    } as Coupon;
                });
                setRawData(coupons);
            } catch (err) {
                console.error(err);
                setRawData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchCoupons();
    }, []);

    return { data, loading };
};

export const useCoupon = (id: string | undefined) => {
    const [rawData, setRawData] = useState<Coupon | null>(null);
    const [loading, setLoading] = useState(true);
    const data = useLocalizedItem(rawData, localizeCoupon);

    useEffect(() => {
        const fetchCoupon = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, 'Coupons', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const images = Array.isArray(data.images) ? data.images.map((img: any) => img.downloadURL || img) : [];
                    const cat = Array.isArray(data.category) ? data.category[0] : data.category;
                    const coords = data.coordinates ? { lat: data.coordinates.latitude, lng: data.coordinates.longitude } : data.coordinates;

                    setRawData({
                        ...data,
                        id: docSnap.id,
                        title: data.title || '',
                        coupon_code: data.coupon_code || data.couponCode,
                        image: data.image || images[0] || '',
                        images: images,
                        category: cat,
                        coordinates: coords
                    } as Coupon);
                } else {
                    setRawData(null);
                }
            } catch (err) {
                console.error(err);
                setRawData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchCoupon();
    }, [id]);

    return { data, loading };
};

// --- NEWS ---
export const useNews = () => {
    const [rawData, setRawData] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const data = useLocalizedArray(rawData, localizeNewsArticle);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'News'));
                const news = snapshot.docs.map(doc => {
                    const data = doc.data();
                    let dateStr = "";
                    if (data.date && typeof data.date.toDate === 'function') {
                        dateStr = data.date.toDate().toLocaleDateString();
                    } else if (typeof data.date === 'string') {
                        dateStr = data.date;
                    }

                    const images = Array.isArray(data.images) ? data.images.map((img: any) => img.downloadURL || img) : [];

                    return {
                        ...data,
                        title: data.title || '',
                        date: dateStr,
                        images: images,
                        image: data.image || images[0] || '',
                        id: doc.id
                    } as NewsArticle;
                });
                setRawData(news);
            } catch (err) {
                console.error(err);
                setRawData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    return { data, loading };
};

export const useNewsArticle = (id: string | undefined) => {
    const [rawData, setRawData] = useState<NewsArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const data = useLocalizedItem(rawData, localizeNewsArticle);

    useEffect(() => {
        const fetchNewsArticle = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, 'News', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    let dateStr = "";
                    if (data.date && typeof data.date.toDate === 'function') {
                        dateStr = data.date.toDate().toLocaleDateString();
                    } else if (typeof data.date === 'string') {
                        dateStr = data.date;
                    }
                    const images = Array.isArray(data.images) ? data.images.map((img: any) => img.downloadURL || img) : [];
                    setRawData({
                        ...data,
                        id: docSnap.id,
                        title: data.title || '',
                        date: dateStr,
                        images: images,
                        image: data.image || images[0] || ''
                    } as NewsArticle);
                } else {
                    setRawData(null);
                }
            } catch (err) {
                console.error(err);
                setRawData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchNewsArticle();
    }, [id]);

    return { data, loading };
};

// --- REFUGIOS ---
export const useRefugios = (departmentId?: string, destinationId?: string) => {
    const [rawData, setRawData] = useState<Refugio[]>([]);
    const [loading, setLoading] = useState(true);
    const data = useLocalizedArray(rawData, localizeRefugio);

    useEffect(() => {
        const fetchRefugios = async () => {
            try {
                setLoading(true);
                let q = collection(db, 'refugios');

                const getUrl = (field: any) => {
                    if (!field) return '';
                    if (typeof field === 'string') return field;
                    if (Array.isArray(field) && field.length > 0) {
                        return field[0].downloadURL || field[0].url || '';
                    }
                    return '';
                };

                const getUrls = (field: any) => {
                    if (!field) return [];
                    if (Array.isArray(field)) {
                        return field.map((item: any) => item.downloadURL || item.url || (typeof item === 'string' ? item : '')).filter(Boolean);
                    }
                    if (typeof field === 'string') return [field];
                    return [];
                };

                let refQuery: any = q;
                if (departmentId) {
                    refQuery = query(refQuery, where('departmentId', '==', departmentId));
                }
                if (destinationId) {
                    refQuery = query(refQuery, where('destinationId', 'array-contains', destinationId));
                }

                const snapshot = await getDocs(refQuery);
                const refugios = snapshot.docs.map(doc => {
                    const data = doc.data() as any;
                    const images = getUrls(data.gallery || data.images || data.galleryImages);
                    const hero = getUrl(data.heroImage) || images[0] || '';
                    const coords = data.coordinates ? { lat: data.coordinates.latitude, lng: data.coordinates.longitude } : null;

                    return {
                        ...data,
                        id: doc.id,
                        name: data.name || 'Sin nombre',
                        departmentId: data.departmentId || '',
                        destinationId: Array.isArray(data.destinationId) ? data.destinationId : (data.destinationId ? [data.destinationId] : []),
                        status: data.status || 'Activo',
                        location: data.location || '',
                        tagline: data.tagline || '',
                        description: data.description || '',
                        heroImage: hero,
                        gallery: images,
                        amenities: data.amenities || [],
                        pricingGuide: data.pricingGuide || [],
                        coupon: data.coupon === true || data.coupon === "true" || data.coupon === "Sí" || data.coupon === "si" || data.coupons === true || data.coupons === "true" || data.coupons === "Sí" || data.coupons === "si",
                        coordinates: coords,
                        howToBook: data.howToBook || '',
                        bookingLink: data.bookingLink || '',
                        activities: data.activities || [],
                        whatsapp: data.whatsapp || '',
                        type: data.type || [],
                        restrictions: data.restrictions || [],
                        checkInCheckOut: data.checkInCheckOut || data.checheckInCheckOut || {}
                    } as any as Refugio;
                });

                setRawData(refugios);
            } catch (err) {
                console.error('Error fetching refugios:', err);
                setRawData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRefugios();
    }, [departmentId, destinationId]);

    return { data, loading };
};

export const useRefugio = (id: string | undefined) => {
    const [rawData, setRawData] = useState<Refugio | null>(null);
    const [loading, setLoading] = useState(true);
    const data = useLocalizedItem(rawData, localizeRefugio);

    useEffect(() => {
        const fetchRefugio = async () => {
            if (!id) {
                setLoading(false);
                return;
            }
            try {
                const docRef = doc(db, 'refugios', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as any;

                    const getUrl = (field: any) => {
                        if (!field) return '';
                        if (typeof field === 'string') return field;
                        if (Array.isArray(field) && field.length > 0) {
                            return field[0].downloadURL || field[0].url || '';
                        }
                        return '';
                    };

                    const getUrls = (field: any) => {
                        if (!field) return [];
                        if (Array.isArray(field)) {
                            return field.map((item: any) => item.downloadURL || item.url || (typeof item === 'string' ? item : '')).filter(Boolean);
                        }
                        if (typeof field === 'string') return [field];
                        return [];
                    };

                    const images = getUrls(data.gallery || data.images || data.galleryImages);
                    const hero = getUrl(data.heroImage) || images[0] || '';
                    const coords = data.coordinates ? { lat: data.coordinates.latitude, lng: data.coordinates.longitude } : null;

                    setRawData({
                        ...data,
                        id: docSnap.id,
                        name: data.name || 'Sin nombre',
                        departmentId: data.departmentId || '',
                        destinationId: Array.isArray(data.destinationId) ? data.destinationId : (data.destinationId ? [data.destinationId] : []),
                        status: data.status || 'Activo',
                        location: data.location || '',
                        tagline: data.tagline || '',
                        description: data.description || '',
                        heroImage: hero,
                        gallery: images,
                        amenities: data.amenities || [],
                        pricingGuide: data.pricingGuide || [],
                        coupon: data.coupon === true || data.coupon === "true" || data.coupon === "Sí" || data.coupon === "si" || data.coupons === true || data.coupons === "true" || data.coupons === "Sí" || data.coupons === "si",
                        coordinates: coords,
                        howToBook: data.howToBook || '',
                        bookingLink: data.bookingLink || '',
                        activities: data.activities || [],
                        whatsapp: data.whatsapp || '',
                        type: data.type || [],
                        restrictions: data.restrictions || [],
                        checkInCheckOut: data.checkInCheckOut || data.checheckInCheckOut || {}
                    } as any as Refugio);
                } else {
                    setRawData(null);
                }
            } catch (err) {
                console.error('Error fetching refugio:', err);
                setRawData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchRefugio();
    }, [id]);

    return { data, loading };
};
