import { Language } from '../types/core';

export interface LegalSection {
    id: string;
    title: string;
    paragraphs: string[];
}

export interface FaqItem {
    q: string;
    a: string;
}

export interface FaqCategory {
    id: string;
    title: string;
    items: FaqItem[];
}

export interface LegalBundle {
    meta: {
        updated: string;
        version: string;
        holder: string;
        jurisdiction: string;
        contactLegal: string;
        contactSupport: string;
        whatsapp: string;
    };
    terms: {
        pageTitle: string;
        heroTitle: string;
        heroHighlight: string;
        intro: string;
        sections: LegalSection[];
    };
    privacy: {
        pageTitle: string;
        heroTitle: string;
        heroHighlight: string;
        intro: string;
        sections: LegalSection[];
    };
    faq: {
        pageTitle: string;
        intro: string;
        categories: FaqCategory[];
    };
    ui: {
        legalDoc: string;
        contactTitle: string;
        contactBody: string;
        emailCta: string;
    };
}

const legalEs: LegalBundle = {
    meta: {
        updated: '29 de mayo de 2026',
        version: '4.0',
        holder: 'Hidden App S.A.S.',
        jurisdiction: 'República de Colombia (Cali, Valle del Cauca)',
        contactLegal: 'legal@hiddenapp.co',
        contactSupport: 'info@hiddenapp.co',
        whatsapp: '+57 302 577 2828',
    },
    terms: {
        pageTitle: 'Términos y Condiciones',
        heroTitle: 'Términos de uso de',
        heroHighlight: 'Hidden App',
        intro:
            'Bienvenido a Hidden App S.A.S. Este documento establece los términos legales que rigen el acceso y uso de nuestra aplicación móvil, sitio web y servicios asociados (la Plataforma). Al utilizar Hidden App, usted acepta estar legalmente vinculado por estos términos.',
        sections: [
            {
                id: 'nature',
                title: '1. Naturaleza del servicio y asunción de riesgos',
                paragraphs: [
                    'Hidden App es una plataforma Expedition-Tech que provee Bóveda Off-Grid, telemetría ambiental, agentes IA (texto y voz), Hidden Guard y conexión con comercios locales. No somos operador turístico, agencia de viajes ni servicio de rescate.',
                    'El ecoturismo conlleva riesgos inherentes. Usted utiliza rutas y destinos sugeridos bajo su propio riesgo y debe contar con equipo, condición física y seguros pertinentes.',
                ],
            },
            {
                id: 'telemetry',
                title: '2. Telemetría ambiental y Bóveda Off-Grid',
                paragraphs: [
                    'GPS, mapas y coordenadas son referenciales. Datos meteorológicos y oceánicos (AccuWeather, Open-Meteo, Stormglass.io) no sustituyen advertencias oficiales.',
                    'Hidden Guard envía alertas informativas; no es servicio de emergencia gubernamental.',
                ],
            },
            {
                id: 'ai',
                title: '3. Uso de inteligencia artificial',
                paragraphs: [
                    'Utilizamos Gemini, LiveKit + Gemini Live y RAG offline. La IA asiste pero puede equivocarse; verifique información crítica de forma independiente.',
                ],
            },
            {
                id: 'premium',
                title: '4. Suscripciones y planes Premium',
                paragraphs: [
                    'Explorador Base (gratis), Pase Viaje (10 días) y Premium (mensual, anual, vitalicio). Precios de referencia en USD; cobro final según tienda.',
                    'Pagos vía App Store, Google Play y RevenueCat. Reembolsos según políticas de cada tienda.',
                ],
            },
            {
                id: 'coupons',
                title: '5. Cupones y aliados locales',
                paragraphs: [
                    'Redención y reservas se realizan con el proveedor final. Las recomendaciones de IA no son reservas confirmadas.',
                ],
            },
            {
                id: 'pact',
                title: '6. El Pacto Hidden',
                paragraphs: [
                    'Turismo responsable: cero huella, respeto cultural y uso legal. El incumplimiento puede suspender su cuenta.',
                ],
            },
            {
                id: 'ip',
                title: '7. Propiedad intelectual',
                paragraphs: [
                    'Contenido, código y bases de datos son propiedad de Hidden App S.A.S., protegidos por ley colombiana e internacional.',
                ],
            },
            {
                id: 'liability',
                title: '8. Limitación de responsabilidad',
                paragraphs: [
                    'Hidden App S.A.S. no será responsable por daños derivados del uso de la plataforma, lesiones en destinos o decisiones basadas en telemetría o IA, en la medida permitida por la ley.',
                ],
            },
            {
                id: 'changes',
                title: '9. Modificaciones',
                paragraphs: [
                    'Podemos modificar funciones y estos Términos en cualquier momento.',
                ],
            },
            {
                id: 'law',
                title: '10. Legislación aplicable',
                paragraphs: [
                    'Leyes de la República de Colombia. Tribunales competentes en Cali, Valle del Cauca.',
                ],
            },
        ],
    },
    privacy: {
        pageTitle: 'Política de Privacidad',
        heroTitle: 'Tu privacidad',
        heroHighlight: 'es nuestra prioridad',
        intro:
            'Describimos cómo recopilamos, usamos y protegemos su información personal conforme a la Ley 1581 de 2012 (Colombia).',
        sections: [
            {
                id: 'collect',
                title: '1. Información que recopilamos',
                paragraphs: [
                    'Cuenta, interacciones IA, preferencias, geolocalización (con permiso), bitácora en COP, packs Off-Grid locales y audio Live en tránsito.',
                ],
            },
            {
                id: 'ai-processing',
                title: '2. Procesamiento de IA',
                paragraphs: [
                    'Consultas transitorias; no entrenamos modelos públicos con sus datos. Aislamiento por departmentId en Modo Live.',
                ],
            },
            {
                id: 'use',
                title: '3. Uso de la información',
                paragraphs: [
                    'Telemetría, alertas, recomendaciones, bitácora, gamificación, cupones, Premium (RevenueCat) y cumplimiento legal.',
                ],
            },
            {
                id: 'share',
                title: '4. Compartir información',
                paragraphs: [
                    'No vendemos datos. Proveedores: Firebase, Gemini, LiveKit, clima, Maps, datos.gov.co, Frankfurter (TRM), RevenueCat.',
                ],
            },
            {
                id: 'security',
                title: '5. Seguridad',
                paragraphs: [
                    'SSL/TLS en tránsito; hashing de contraseñas. Packs Off-Grid en sandbox local eliminables desde la app.',
                ],
            },
            {
                id: 'rights',
                title: '6. Derechos (Habeas Data)',
                paragraphs: [
                    'Conocer, actualizar, rectificar y solicitar supresión según Ley 1581 de 2012.',
                ],
            },
            {
                id: 'deletion',
                title: '7. Eliminación de cuenta',
                paragraphs: [
                    'Desde Ajustes → Mi perfil o por correo. Máximo 15 días hábiles. DPO: legal@hiddenapp.co',
                ],
            },
        ],
    },
    faq: {
        pageTitle: 'Preguntas frecuentes',
        intro: 'Respuestas sobre planes Premium, tecnología, seguridad y exploración en Hidden App.',
        categories: [
            {
                id: 'premium',
                title: 'Suscripciones y Premium',
                items: [
                    {
                        q: '¿Diferencia entre Explorador Base y Premium?',
                        a: 'Base: catálogo, bóveda, monitor, límites en chat/Ranger/Live, bitácora solo. Premium: capacidades ampliadas (Hub, PDFs, grupal, cupones).',
                    },
                    {
                        q: '¿Qué es el Pase Viaje?',
                        a: 'Plan de 10 días sin renovación automática con capacidades Premium en esa ventana.',
                    },
                    {
                        q: '¿Puedo cancelar Premium?',
                        a: 'Sí, desde la tienda. Conservas acceso hasta fin del ciclo vigente.',
                    },
                ],
            },
            {
                id: 'tech',
                title: 'Tecnología e IA',
                items: [
                    {
                        q: '¿Funciona sin señal?',
                        a: 'Descarga packs en Bóveda Off-Grid. Consulta local y chat offline con RAG.',
                    },
                    {
                        q: '¿La app es bilingüe?',
                        a: 'Sí (ES/EN). Agentes responden en el idioma configurado.',
                    },
                ],
            },
            {
                id: 'budget',
                title: 'Bitácora',
                items: [
                    {
                        q: '¿Moneda en la bitácora?',
                        a: 'COP canónico; USD/EUR con TRM oficial. Offline muestra última actualización.',
                    },
                ],
            },
            {
                id: 'account',
                title: 'Cuenta',
                items: [
                    {
                        q: '¿Cómo elimino mi cuenta?',
                        a: 'Ajustes → Mi perfil → Eliminar cuenta, o escribe a soporte.',
                    },
                    {
                        q: '¿Cómo vinculo cuenta invitado?',
                        a: 'Ajustes → vincular Google o correo. Conservas tu UID y progreso.',
                    },
                ],
            },
        ],
    },
    ui: {
        legalDoc: 'Documento legal',
        contactTitle: '¿Preguntas legales?',
        contactBody: 'Contacta a nuestro equipo de privacidad y cumplimiento.',
        emailCta: 'Escribir a legal',
    },
};

const legalEn: LegalBundle = {
    meta: {
        updated: 'May 29, 2026',
        version: '4.0',
        holder: 'Hidden App S.A.S.',
        jurisdiction: 'Republic of Colombia (Cali, Valle del Cauca)',
        contactLegal: 'legal@hiddenapp.co',
        contactSupport: 'info@hiddenapp.co',
        whatsapp: '+57 302 577 2828',
    },
    terms: {
        pageTitle: 'Terms of Use',
        heroTitle: 'Terms of use for',
        heroHighlight: 'Hidden App',
        intro:
            'Welcome to Hidden App S.A.S. These terms govern use of our mobile app, website, and related services. By using Hidden App, you agree to be legally bound.',
        sections: legalEs.terms.sections.map((s, i) => ({
            ...s,
            title: [
                '1. Nature of the service and assumption of risk',
                '2. Environmental telemetry and Off-Grid Vault',
                '3. Use of artificial intelligence',
                '4. Subscriptions and Premium plans',
                '5. Coupons and local partners',
                '6. The Hidden Pact',
                '7. Intellectual property',
                '8. Limitation of liability',
                '9. Modifications',
                '10. Applicable law',
            ][i],
            paragraphs: [
                [
                    'Hidden App is an Expedition-Tech platform (Off-Grid Vault, environmental telemetry, AI agents, Hidden Guard). We are not a tour operator or rescue service.',
                    'Ecotourism carries inherent risks. You use suggested routes at your own risk with proper equipment and insurance.',
                ],
                [
                    'GPS and maps are referential. Weather/ocean data do not replace official warnings.',
                    'Hidden Guard alerts are informative, not government emergency services.',
                ],
                ['We use Gemini, LiveKit + Gemini Live, and offline RAG. AI may be wrong; verify critical information independently.'],
                [
                    'Explorer Base (free), Trip Pass (10 days), and Premium plans. Reference USD prices; stores may charge locally.',
                    'Payments via App Store, Google Play, RevenueCat.',
                ],
                ['Redemption and bookings are with the final provider. AI suggestions are not confirmed reservations.'],
                ['Responsible tourism: zero trace, cultural respect, lawful use. Violations may suspend your account.'],
                ['Content and databases are owned by Hidden App S.A.S., protected under Colombian and international law.'],
                ['Hidden App S.A.S. is not liable for platform-use damages or AI-based decisions to the extent permitted by law.'],
                ['We may modify features and these Terms at any time.'],
                ['Governed by Colombian law. Courts in Cali, Valle del Cauca.'],
            ][i],
        })),
    },
    privacy: {
        pageTitle: 'Privacy Policy',
        heroTitle: 'Your privacy',
        heroHighlight: 'is our priority',
        intro:
            'How we collect, use, and protect personal information under Colombian Law 1581 of 2012.',
        sections: legalEs.privacy.sections.map((s, i) => ({
            ...s,
            title: [
                '1. Information we collect',
                '2. AI processing',
                '3. Use of information',
                '4. Sharing information',
                '5. Security',
                '6. Your rights (Habeas Data)',
                '7. Account deletion',
            ][i],
            paragraphs: [
                ['Account, AI interactions, preferences, geolocation (with permission), COP expense log, local Off-Grid packs, Live audio in transit.'],
                ['Transient queries; we do not train public models on your data. departmentId isolation in Live Mode.'],
                ['Telemetry, alerts, recommendations, log, gamification, coupons, Premium (RevenueCat), legal compliance.'],
                ['We do not sell data. Providers: Firebase, Gemini, LiveKit, weather, Maps, datos.gov.co, Frankfurter (TRM), RevenueCat.'],
                ['SSL/TLS in transit; password hashing. Off-Grid packs in local sandbox.'],
                ['Know, update, rectify, and request deletion under Law 1581 of 2012.'],
                ['From Settings → My profile or email. Within 15 business days. DPO: legal@hiddenapp.co'],
            ][i],
        })),
    },
    faq: {
        pageTitle: 'Frequently asked questions',
        intro: 'Answers about Premium, technology, safety, and exploration on Hidden App.',
        categories: [
            {
                id: 'premium',
                title: 'Subscriptions and Premium',
                items: [
                    {
                        q: 'Explorer Base vs Premium?',
                        a: 'Base: catalog, vault, monitor, chat/Ranger/Live limits, solo log. Premium: expanded hub, PDFs, group log, coupons.',
                    },
                    {
                        q: 'What is Trip Pass?',
                        a: '10-day non-renewing plan with Premium capabilities in that window.',
                    },
                    {
                        q: 'Can I cancel Premium?',
                        a: 'Yes via the store. Access until end of billing cycle.',
                    },
                ],
            },
            {
                id: 'tech',
                title: 'Technology and AI',
                items: [
                    {
                        q: 'Works offline?',
                        a: 'Download Off-Grid packs. Local search and offline RAG chat.',
                    },
                    {
                        q: 'Bilingual app?',
                        a: 'Yes (ES/EN). Agents mirror the configured app language.',
                    },
                ],
            },
            {
                id: 'budget',
                title: 'Expense log',
                items: [
                    {
                        q: 'Currency in the log?',
                        a: 'Canonical COP; USD/EUR with official TRM. Offline shows last update.',
                    },
                ],
            },
            {
                id: 'account',
                title: 'Account',
                items: [
                    {
                        q: 'Delete account?',
                        a: 'Settings → My profile → Delete account, or email support.',
                    },
                    {
                        q: 'Link guest account?',
                        a: 'Settings → link Google or email. Keep your UID and progress.',
                    },
                ],
            },
        ],
    },
    ui: {
        legalDoc: 'Legal document',
        contactTitle: 'Legal questions?',
        contactBody: 'Contact our privacy and compliance team.',
        emailCta: 'Email legal',
    },
};

export function getLegalContent(language: Language): LegalBundle {
    return language === Language.English ? legalEn : legalEs;
}
