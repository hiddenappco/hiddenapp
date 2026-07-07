import { setGlobalOptions } from "firebase-functions/v2";

// Configure Global Options (Region)
setGlobalOptions({ region: "us-central1" });

// API Triggers (Top-level exports for Firebase)
export {
    scheduledEnvironmentalMonitor,
    onNewDestination,
    onNewNews,
    onNewCoupon,
    onNewEvent,
    onNewRefugio,
    supportTicketReply,
    onExpeditionReadyNotify
} from './api/notifications';

export {
    environmentalAgent,
    chatAgent
} from './api/agents';

export {
    generateTripPdf,
    generateDestinationPdf,
    generateExpeditionPdf,
} from './api/pdf';

export { purgeDestinationPdfCacheHttp } from './api/destinationPdfCache';

export {
    generateLiveKitToken,
    recordLiveCallSeconds
} from './api/livekit';

export {
    createExpedition,
    onExpeditionCreate
} from './api/expeditions';

export {
    getExchangeRates,
    scheduledExchangeRates,
} from './api/exchangeRates';

export {
    generateDepartmentPack,
    onDestinationWritePack,
    onCouponWritePack,
    onEventWritePack,
    onRefugioWritePack,
    onDepartmentWritePack,
    onProtocolWritePack
} from './api/packs';

export {
    onUserPremiumSync,
    scheduledPremiumExpiry,
} from './api/premiumSync';

export { verifyTripMemberBackfill } from './api/tripBackfill';

export { scheduledGuestCleanup } from './api/guestCleanup';

export { onTripDocumentWritten, onTripDeletedCleanupDocuments } from './api/tripDocuments';

export { onTripExpenseWritten } from './api/directEconomicInjection';
