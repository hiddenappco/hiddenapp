import { onRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { db, storage } from "../config/firebase";
import initSqlJs from "sql.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Main helper to compile Firestore data into a SQLite database,
 * upload it to Firebase Storage, and update the registry in Firestore.
 */
export async function buildPackForDepartment(departmentId: string): Promise<string> {
  console.log(`[buildPackForDepartment] Starting SQLite pack build for: ${departmentId}`);

  // 1. Fetch data from Firestore in parallel
  const [destinationsSnap, couponsSnap, eventsSnap, refugiosSnap, protocolsSpecificSnap, protocolsGlobalSnap] = await Promise.all([
    db.collection("destinations").where("departmentId", "==", departmentId).get(),
    db.collection("Coupons").where("departmentId", "==", departmentId).get(),
    db.collection("Events").where("departmentId", "==", departmentId).get(),
    db.collection("refugios").where("departmentId", "==", departmentId).get(),
    db.collection("survival_protocols").where("departmentId", "==", departmentId).get(),
    db.collection("survival_protocols").where("departmentId", "==", "global").get()
  ]);

  // Combine specific and global protocols
  const protocolsDocs = [...protocolsSpecificSnap.docs, ...protocolsGlobalSnap.docs];
  
  // Deduplicate by doc ID just in case
  const protocolMap = new Map();
  protocolsDocs.forEach(doc => protocolMap.set(doc.id, { id: doc.id, ...doc.data() as any }));
  const protocols = Array.from(protocolMap.values()) as any[];

  const destinations = destinationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  const coupons = couponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  const refugios = refugiosSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as any))
    .filter((r: any) => r.status === "Activo" || r.status === true);

  console.log(`[buildPackForDepartment] Data fetched for ${departmentId}:`);
  console.log(`- Destinations: ${destinations.length}`);
  console.log(`- Coupons: ${coupons.length}`);
  console.log(`- Events: ${events.length}`);
  console.log(`- Refugios: ${refugios.length}`);
  console.log(`- Survival Protocols: ${protocols.length}`);

  // 2. Initialize sql.js in-memory database
  const SQL = await initSqlJs();
  const sqliteDb = new SQL.Database();

  // Create tables matching schemas
  sqliteDb.run(`
    CREATE TABLE destinations (
      id TEXT PRIMARY KEY,
      title TEXT,
      title_en TEXT,
      location TEXT,
      location_en TEXT,
      description TEXT,
      description_en TEXT,
      hiking TEXT,
      temp TEXT,
      signal TEXT,
      isCoastal TEXT,
      aiTip TEXT,
      aiTip_en TEXT,
      activities TEXT,
      activities_en TEXT,
      gettingThere TEXT,
      gettingThere_en TEXT,
      pricingGuide TEXT,
      pricingGuide_en TEXT,
      packingGuide TEXT,
      packingGuide_en TEXT,
      packingSummary TEXT,
      packingSummary_en TEXT
    );
  `);

  sqliteDb.run(`
    CREATE TABLE coupons (
      id TEXT PRIMARY KEY,
      title TEXT,
      title_en TEXT,
      description TEXT,
      description_en TEXT,
      discount TEXT,
      location TEXT,
      coupon_code TEXT,
      validity TEXT,
      redemptionInstructions TEXT,
      redemptionInstructions_en TEXT
    );
  `);

  sqliteDb.run(`
    CREATE TABLE events (
      id TEXT PRIMARY KEY,
      name TEXT,
      name_en TEXT,
      subtitle TEXT,
      subtitle_en TEXT,
      location TEXT,
      date TEXT,
      description TEXT,
      description_en TEXT,
      tips TEXT,
      tips_en TEXT
    );
  `);

  sqliteDb.run(`
    CREATE TABLE survival_protocols (
      id TEXT PRIMARY KEY,
      category TEXT,
      title TEXT,
      title_en TEXT,
      keywords TEXT,
      content TEXT,
      content_en TEXT
    );
  `);

  sqliteDb.run(`
    CREATE TABLE refugios (
      id TEXT PRIMARY KEY,
      name TEXT,
      name_en TEXT,
      tagline TEXT,
      tagline_en TEXT,
      location TEXT,
      description TEXT,
      description_en TEXT,
      destinationId TEXT,
      type TEXT,
      amenities TEXT,
      pricingGuide TEXT,
      howToBook TEXT,
      howToBook_en TEXT,
      bookingLink TEXT,
      whatsapp TEXT,
      hasCoupon INTEGER
    );
  `);

  // 3. Populate tables (using parameterized statements to prevent SQL injections)
  // Destinations
  const serializePackingField = (raw: unknown): string => {
    if (raw == null || raw === "") return "";
    if (typeof raw === "string") return raw;
    return JSON.stringify(raw);
  };

  const destStmt = sqliteDb.prepare(`
    INSERT INTO destinations (id, title, title_en, location, location_en, description, description_en, hiking, temp, signal, isCoastal, aiTip, aiTip_en, activities, activities_en, gettingThere, gettingThere_en, pricingGuide, pricingGuide_en, packingGuide, packingGuide_en, packingSummary, packingSummary_en)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);
  for (const item of destinations) {
    const stats = item.stats || {};
    const activities = item.activities ? JSON.stringify(item.activities) : "[]";
    const activitiesEn = item.activities_en ? JSON.stringify(item.activities_en) : "[]";
    const gettingThere = item.gettingThere ? JSON.stringify(item.gettingThere) : "[]";
    const gettingThereEn = item.gettingThere_en ? JSON.stringify(item.gettingThere_en) : "[]";
    destStmt.run([
      item.id,
      item.title || item.name || "",
      item.title_en || "",
      item.location || "",
      item.location_en || "",
      item.description || "",
      item.description_en || "",
      item.hikingLevel || stats.hiking || "",
      item.statsTemp || stats.temp || "",
      item.statsSignal || stats.signal || "",
      String(item.isCoastal || ""),
      item.aiTip || "",
      item.aiTip_en || "",
      activities,
      activitiesEn,
      gettingThere,
      gettingThereEn,
      serializePackingField(item.pricingGuide),
      serializePackingField(item.pricingGuide_en),
      serializePackingField(item.packingGuide),
      serializePackingField(item.packingGuide_en),
      String(item.packingSummary || ""),
      String(item.packingSummary_en || ""),
    ]);
  }
  destStmt.free();

  // Coupons
  const couponStmt = sqliteDb.prepare(`
    INSERT INTO coupons (id, title, title_en, description, description_en, discount, location, coupon_code, validity, redemptionInstructions, redemptionInstructions_en)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);
  for (const item of coupons) {
    couponStmt.run([
      item.id,
      item.title || "",
      item.title_en || "",
      item.description || "",
      item.description_en || "",
      item.discount || "",
      item.location || "",
      item.coupon_code || item.couponCode || "",
      item.validity || "",
      item.redemptionInstructions || "",
      item.redemptionInstructions_en || ""
    ]);
  }
  couponStmt.free();

  // Events
  const eventStmt = sqliteDb.prepare(`
    INSERT INTO events (id, name, name_en, subtitle, subtitle_en, location, date, description, description_en, tips, tips_en)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);
  for (const item of events) {
    let dateStr = "";
    if (item.date) {
      dateStr = typeof item.date.toDate === "function" 
        ? item.date.toDate().toLocaleDateString("es-CO") 
        : String(item.date);
    }
    eventStmt.run([
      item.id,
      item.name || "",
      item.name_en || "",
      item.subtitle || "",
      item.subtitle_en || "",
      item.location || "",
      dateStr,
      item.description || "",
      item.description_en || "",
      item.tips || "",
      item.tips_en || ""
    ]);
  }
  eventStmt.free();

  // Protocols
  const protocolStmt = sqliteDb.prepare(`
    INSERT INTO survival_protocols (id, category, title, title_en, keywords, content, content_en)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `);
  for (const item of protocols) {
    const keywords = item.keywords ? JSON.stringify(item.keywords) : "[]";
    protocolStmt.run([
      item.id,
      item.category || "",
      item.title || "",
      item.title_en || "",
      keywords,
      item.content || "",
      item.content_en || ""
    ]);
  }
  protocolStmt.free();

  // Refugios (hospedajes verificados — sin imágenes para mantener el pack ligero)
  const refugioStmt = sqliteDb.prepare(`
    INSERT INTO refugios (
      id, name, name_en, tagline, tagline_en, location, description, description_en,
      destinationId, type, amenities, pricingGuide, howToBook, howToBook_en, bookingLink, whatsapp, hasCoupon
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);
  for (const item of refugios) {
    const destIds = Array.isArray(item.destinationId)
      ? item.destinationId
      : item.destinationId
        ? [item.destinationId]
        : [];
    const types = Array.isArray(item.type) ? item.type : item.type ? [item.type] : [];
    const amenities = Array.isArray(item.amenities) ? item.amenities : [];
    const pricingGuide =
      item.pricingGuide && typeof item.pricingGuide === "object"
        ? JSON.stringify(item.pricingGuide)
        : String(item.pricingGuide || "");
    refugioStmt.run([
      item.id,
      item.name || "",
      item.name_en || "",
      item.tagline || "",
      item.tagline_en || "",
      item.location || "",
      item.description || "",
      item.description_en || "",
      JSON.stringify(destIds),
      JSON.stringify(types),
      JSON.stringify(amenities),
      pricingGuide,
      item.howToBook || "",
      item.howToBook_en || "",
      item.bookingLink || "",
      item.whatsapp || "",
      item.coupon ? 1 : 0,
    ]);
  }
  refugioStmt.free();

  // 4. Export database binary buffer
  const binaryArray = sqliteDb.export();
  const dbBuffer = Buffer.from(binaryArray);
  sqliteDb.close();

  console.log(`[buildPackForDepartment] SQLite database generated successfully. Size: ${(dbBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

  // 5. Upload buffer to Firebase Storage
  const bucket = storage.bucket();
  const filePath = `packs/${departmentId}/pack.db`;
  const file = bucket.file(filePath);
  const token = uuidv4();

  await file.save(dbBuffer, {
    metadata: {
      contentType: "application/x-sqlite3",
      metadata: {
        firebaseStorageDownloadTokens: token
      }
    }
  });

  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
  console.log(`[buildPackForDepartment] SQLite pack uploaded to Storage: ${downloadUrl}`);

  // 6. Update Registry in Firestore
  const now = new Date();
  await db.collection("department_packs").doc(departmentId).set({
    downloadUrl,
    sizeBytes: dbBuffer.length,
    lastUpdated: now
  }, { merge: true });

  console.log(`[buildPackForDepartment] Firestore registry updated for: ${departmentId}`);
  return downloadUrl;
}

/**
 * HTTPS Callable cloud function to trigger/generate a department pack on demand.
 */
export const generateDepartmentPack = onRequest(
  { cors: true, timeoutSeconds: 120, memory: "1GiB" },
  async (req, res) => {
    try {
      const { departmentId } = req.body || req.query;

      if (!departmentId) {
        res.status(400).json({ error: "Missing parameter: departmentId" });
        return;
      }

      const downloadUrl = await buildPackForDepartment(departmentId);
      res.status(200).json({ success: true, departmentId, downloadUrl });
    } catch (err: any) {
      console.error("[generateDepartmentPack] CRITICAL ERROR:", err);
      res.status(500).json({ error: err.message || "Unknown internal error" });
    }
  }
);

/**
 * Triggers to automatically rebuild SQLite packs when Firestore documents change.
 * 
 * Using onDocumentWritten instead of onDocumentUpdated to cover the FULL lifecycle:
 * - CREATE: New destination/coupon/event/protocol added in Rowy
 * - UPDATE: Existing document edited in Rowy
 * - DELETE: Document removed in Rowy
 * 
 * This ensures the offline pack.db always reflects the latest state of the database.
 */

// Rebuild when a destination is created, updated, or deleted
export const onDestinationWritePack = onDocumentWritten("destinations/{id}", async (event) => {
  const data = event.data?.after?.data() || event.data?.before?.data();
  if (data && data.departmentId) {
    await buildPackForDepartment(data.departmentId);
  }
});

// Rebuild when a coupon is created, updated, or deleted
export const onCouponWritePack = onDocumentWritten("Coupons/{id}", async (event) => {
  const data = event.data?.after?.data() || event.data?.before?.data();
  if (data && data.departmentId) {
    await buildPackForDepartment(data.departmentId);
  }
});

// Rebuild when a fair/event is created, updated, or deleted
export const onEventWritePack = onDocumentWritten("Events/{id}", async (event) => {
  const data = event.data?.after?.data() || event.data?.before?.data();
  if (data && data.departmentId) {
    await buildPackForDepartment(data.departmentId);
  }
});

// Rebuild when a refugio is created, updated, or deleted
export const onRefugioWritePack = onDocumentWritten("refugios/{id}", async (event) => {
  const after = event.data?.after?.data();
  const before = event.data?.before?.data();
  const deptIds = new Set<string>();
  if (after?.departmentId) deptIds.add(after.departmentId);
  if (before?.departmentId) deptIds.add(before.departmentId);
  for (const deptId of deptIds) {
    await buildPackForDepartment(deptId);
  }
});

// Rebuild when a protocol is created, updated, or deleted (can be local or global)
export const onProtocolWritePack = onDocumentWritten("survival_protocols/{id}", async (event) => {
  const data = event.data?.after?.data() || event.data?.before?.data();
  if (!data) return;

  if (data.departmentId === "global") {
    // Rebuild for ALL active departments
    console.log("[onProtocolWritePack] Global protocol modified. Rebuilding all department packs...");
    const deptsSnap = await db.collection("departments").get();
    const rebuilds = deptsSnap.docs.map(doc => buildPackForDepartment(doc.id));
    await Promise.all(rebuilds);
  } else if (data.departmentId) {
    await buildPackForDepartment(data.departmentId);
  }
});
