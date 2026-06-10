import React from 'react';

interface TermsOfUseProps {
  onBack: () => void;
}

export const TermsOfUse: React.FC<TermsOfUseProps> = ({ onBack }) => {
  return (
    <div className="bg-background-dark font-display antialiased text-content h-screen w-full overflow-hidden flex flex-col">
      <div className="relative flex h-full w-full flex-col max-w-md mx-auto bg-background-dark shadow-xl">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-50 flex items-center justify-between bg-background-dark/95 backdrop-blur-sm p-4 border-b border-overlay/10">
          <button
            onClick={onBack}
            className="flex size-10 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors group"
          >
            <span className="material-symbols-outlined text-content group-hover:text-primary transition-colors">arrow_back_ios_new</span>
          </button>
          <h1 className="text-content text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
            Términos y Condiciones
          </h1>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 flex flex-col pb-24 overflow-y-auto no-scrollbar">
          {/* Welcome Header */}
          <div className="px-5 pt-6 pb-2">
            <h2 className="text-content text-[28px] font-extrabold leading-tight tracking-tight">
              Bienvenido a Hidden
            </h2>
            <p className="text-content-muted text-sm font-medium mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-base">schedule</span>
              Última actualización: 15 de Octubre, 2023
            </p>
          </div>

          {/* Quick Navigation Chips */}
          <div className="sticky top-0 z-40 bg-background-dark/95 backdrop-blur-sm py-3 border-b border-overlay/5">
            <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar snap-x">
              <button className="snap-start shrink-0 flex h-8 items-center justify-center rounded-full bg-primary text-white px-4 text-sm font-semibold shadow-sm shadow-primary/30">
                General
              </button>
              <button className="snap-start shrink-0 flex h-8 items-center justify-center rounded-full bg-overlay/10 text-gray-200 px-4 text-sm font-medium hover:bg-primary/10 transition-colors">
                Uso de IA
              </button>
              <button className="snap-start shrink-0 flex h-8 items-center justify-center rounded-full bg-overlay/10 text-gray-200 px-4 text-sm font-medium hover:bg-primary/10 transition-colors">
                Privacidad
              </button>
              <button className="snap-start shrink-0 flex h-8 items-center justify-center rounded-full bg-overlay/10 text-gray-200 px-4 text-sm font-medium hover:bg-primary/10 transition-colors">
                Offline
              </button>
              <button className="snap-start shrink-0 flex h-8 items-center justify-center rounded-full bg-overlay/10 text-gray-200 px-4 text-sm font-medium hover:bg-primary/10 transition-colors">
                Propiedad IP
              </button>
            </div>
          </div>

          {/* Content Sections */}
          <div className="flex flex-col gap-8 px-5 pt-6">
            {/* Introduction */}
            <section>
              <p className="text-secondary dark:text-content-secondary text-base font-normal leading-relaxed">
                Gracias por elegir Hidden para descubrir los paraísos escondidos de Colombia. Por favor, lee detenidamente estos términos antes de utilizar nuestros servicios de descubrimiento turístico, incluyendo nuestra IA conversacional y herramientas de navegación offline. Al acceder a la aplicación, aceptas estar vinculado por estos términos.
              </p>
            </section>

            {/* Section 1: AI Usage */}
            <section className="group">
              <h3 className="flex items-center gap-2 text-xl font-bold text-secondary dark:text-content mb-3">
                <span className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-xl">smart_toy</span>
                </span>
                1. Uso de Inteligencia Artificial
              </h3>
              {/* TL;DR Box */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-sm">info</span>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">En resumen</span>
                </div>
                <p className="text-sm text-secondary/80 dark:text-content-secondary leading-snug">
                  Nuestra IA es un asistente útil, pero puede cometer errores. Verifica siempre las condiciones locales y recomendaciones de seguridad.
                </p>
              </div>
              <p className="text-secondary dark:text-content-secondary text-base leading-relaxed">
                Hidden utiliza modelos de lenguaje avanzados para ofrecer recomendaciones personalizadas de viaje. Aunque nos esforzamos por la precisión, la información generada por la IA:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-2 text-secondary dark:text-content-secondary text-base leading-relaxed">
                <li>Debe ser utilizada como sugerencia y no como verdad absoluta.</li>
                <li>Puede no reflejar cambios en tiempo real (clima, cierres de vías, orden público).</li>
                <li>No sustituye el asesoramiento profesional de guías turísticos certificados.</li>
              </ul>
            </section>

            {/* Section 2: Privacy */}
            <section>
              <h3 className="flex items-center gap-2 text-xl font-bold text-secondary dark:text-content mb-3">
                <span className="flex items-center justify-center size-8 rounded-lg bg-accent/10 text-accent dark:text-green-400">
                  <span className="material-symbols-outlined text-xl">security</span>
                </span>
                2. Privacidad y Datos
              </h3>
              <p className="text-secondary dark:text-content-secondary text-base leading-relaxed mb-3">
                Tu privacidad es fundamental para nosotros. Recopilamos datos de ubicación únicamente para mejorar tu experiencia de descubrimiento y permitir el funcionamiento de los mapas offline.
              </p>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-overlay/5 rounded-lg">
                <span className="material-symbols-outlined text-content-muted mt-0.5">visibility_off</span>
                <p className="text-sm text-gray-600 dark:text-content-muted">
                  Tus conversaciones con la IA son anonimizadas y utilizadas para entrenar el modelo solo si das tu consentimiento explícito en la configuración.
                </p>
              </div>
            </section>

            {/* Section 3: Offline Tools */}
            <section>
              <h3 className="flex items-center gap-2 text-xl font-bold text-secondary dark:text-content mb-3">
                <span className="flex items-center justify-center size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <span className="material-symbols-outlined text-xl">map</span>
                </span>
                3. Herramientas Offline
              </h3>
              <p className="text-secondary dark:text-content-secondary text-base leading-relaxed">
                Las descargas de mapas consumen espacio de almacenamiento en tu dispositivo. Hidden no se hace responsable por el consumo de datos móviles durante la descarga inicial de los paquetes de regiones. Asegúrate de descargar tus zonas de interés mientras tengas conexión Wi-Fi estable.
              </p>
            </section>

            {/* Section 4: Liability */}
            <section>
              <h3 className="flex items-center gap-2 text-xl font-bold text-secondary dark:text-content mb-3">
                <span className="flex items-center justify-center size-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <span className="material-symbols-outlined text-xl">gavel</span>
                </span>
                4. Limitación de Responsabilidad
              </h3>
              <p className="text-secondary dark:text-content-secondary text-base leading-relaxed">
                El turismo de aventura conlleva riesgos inherentes. Hidden no asume responsabilidad por:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-2 text-secondary dark:text-content-secondary text-base leading-relaxed">
                <li>Accidentes personales o lesiones durante los viajes.</li>
                <li>Pérdida de propiedad personal.</li>
                <li>Discrepancias entre las fotos de la app y el estado actual de los destinos.</li>
              </ul>
            </section>

            {/* Section 5: Modifications */}
            <section>
              <h3 className="text-lg font-bold text-secondary dark:text-content mb-2">
                5. Modificaciones a los Términos
              </h3>
              <p className="text-secondary dark:text-content-secondary text-base leading-relaxed">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. Te notificaremos sobre cambios significativos a través de la aplicación o por correo electrónico.
              </p>
            </section>
            <div className="h-8"></div>
          </div>
        </main>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 z-50 p-5 bg-background-dark border-t border-overlay/10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 mb-2">
              <div className="flex h-5 items-center">
                <input defaultChecked className="h-5 w-5 rounded border-overlay/20 text-primary focus:ring-primary bg-overlay/10" id="terms-checkbox" type="checkbox" />
              </div>
              <label className="text-sm text-content-muted font-medium" htmlFor="terms-checkbox">
                He leído y acepto los <span className="text-primary underline">Términos y Condiciones</span> y la <span className="text-primary underline">Política de Privacidad</span>.
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onBack}
                className="flex-1 flex items-center justify-center h-12 rounded-xl bg-overlay/10 text-content font-bold hover:bg-overlay/20 transition-colors"
              >
                Rechazar
              </button>
              <button
                onClick={onBack}
                className="flex-[2] flex items-center justify-center h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors"
              >
                Aceptar y Continuar
              </button>
            </div>
          </div>
          {/* Home Indicator Area imitation */}
          <div className="h-1 w-1/3 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-5"></div>
        </div>
      </div>
    </div>
  );
};