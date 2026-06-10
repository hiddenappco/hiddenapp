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
    supportTicketReply
} from './api/notifications';

export {
    environmentalAgent,
    chatAgent
} from './api/agents';

export {
    generateTripPdf
} from './api/pdf';

export {
    generateLiveKitToken
} from './api/livekit';

export {
    onExpeditionCreate
} from './api/expeditions';

export {
    generateDepartmentPack,
    onDestinationWritePack,
    onCouponWritePack,
    onEventWritePack,
    onRefugioWritePack,
    onProtocolWritePack
} from './api/packs';
