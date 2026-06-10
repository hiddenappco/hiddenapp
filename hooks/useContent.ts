import { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    limit,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Department, Destination, AppEvent, Coupon, NewsArticle, Refugio } from '../types/content';

// --- DEPARTMENTS ---
export const useDepartments = () => {
    const [data, setData] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'departments'));
                const depts: Department[] = querySnapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                } as Department));

                setData(depts);
            } catch (err: any) {
                console.error('Error fetching departments:', err);
                setError(err);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDepartments();
    }, []);

    return { data, loading, error };
};

export const useDepartment = (id: string | undefined) => {
    const [data, setData] = useState<Department | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDepartment = async () => {
            if (!id) {
                setData(null);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const docSnap = await getDoc(doc(db, 'departments', id));

                if (docSnap.exists()) {
                    setData({ id: docSnap.id, ...docSnap.data() } as Department);
                    return;
                }

                // Fallback: id may be a slug (e.g. valle-del-cauca) rather than Firestore doc id
                const bySlug = await getDocs(
                    query(collection(db, 'departments'), where('departmentId', '==', id), limit(1))
                );
                if (!bySlug.empty) {
                    const found = bySlug.docs[0];
                    setData({ id: found.id, ...found.data() } as Department);
                } else {
                    setData(null);
                }
            } catch (err) {
                console.error(err);
                setData(null);
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
    const [data, setData] = useState<Destination[]>([]);
    const [loading, setLoading] = useState(true);

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
                    setData(dests);
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
                    setData(dests);
                }

            } catch (err) {
                console.error(err);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDestinations();
    }, [departmentId]);

    return { data, loading };
};

export const useDestination = (id: string | undefined) => {
    const [data, setData] = useState<Destination | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            setData(null);
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
                    setData(mapDestinationDoc(docSnap.id, docSnap.data() as Record<string, unknown>));
                    return;
                }

                const byCustomId = await getDocs(
                    query(collection(db, 'destinations'), where('id', '==', id), limit(1))
                );
                if (!byCustomId.empty) {
                    const found = byCustomId.docs[0];
                    setData(mapDestinationDoc(found.id, found.data() as Record<string, unknown>));
                    return;
                }

                setData(null);
            } catch (err) {
                console.error(err);
                setData(null);
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
    const [data, setData] = useState<AppEvent[]>([]);
    const [loading, setLoading] = useState(true);

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
                setData(events);
            } catch (err) {
                console.error(err);
                setData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    return { data, loading };
};

export const useEvent = (id: string | undefined) => {
    const [data, setData] = useState<AppEvent | null>(null);
    const [loading, setLoading] = useState(true);

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

                    setData({
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
                    setData(null);
                }
            } catch (err) {
                console.error(err);
                setData(null);
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
    const [data, setData] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);

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
                setData(coupons);
            } catch (err) {
                console.error(err);
                setData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchCoupons();
    }, []);

    return { data, loading };
};

export const useCoupon = (id: string | undefined) => {
    const [data, setData] = useState<Coupon | null>(null);
    const [loading, setLoading] = useState(true);

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

                    setData({
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
                    setData(null);
                }
            } catch (err) {
                console.error(err);
                setData(null);
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
    const [data, setData] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);

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
                setData(news);
            } catch (err) {
                console.error(err);
                setData([]);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    return { data, loading };
};

export const useNewsArticle = (id: string | undefined) => {
    const [data, setData] = useState<NewsArticle | null>(null);
    const [loading, setLoading] = useState(true);

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
                    setData({
                        ...data,
                        id: docSnap.id,
                        title: data.title || '',
                        date: dateStr,
                        images: images,
                        image: data.image || images[0] || ''
                    } as NewsArticle);
                } else {
                    setData(null);
                }
            } catch (err) {
                console.error(err);
                setData(null);
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
    const [data, setData] = useState<Refugio[]>([]);
    const [loading, setLoading] = useState(true);

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

                setData(refugios);
            } catch (err) {
                console.error('Error fetching refugios:', err);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRefugios();
    }, [departmentId, destinationId]);

    return { data, loading };
};

export const useRefugio = (id: string | undefined) => {
    const [data, setData] = useState<Refugio | null>(null);
    const [loading, setLoading] = useState(true);

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

                    setData({
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
                    setData(null);
                }
            } catch (err) {
                console.error('Error fetching refugio:', err);
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchRefugio();
    }, [id]);

    return { data, loading };
};
