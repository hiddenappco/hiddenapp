import { buildPackForDepartment } from "./api/packs";
import * as admin from "firebase-admin";

async function main() {
  console.log("Initializing admin SDK with project ID: gen-lang-client-0040858908...");
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: "gen-lang-client-0040858908"
    });
  }

  const depts = ["valle-del-cauca", "amazonas"];
  for (const deptId of depts) {
    try {
      console.log(`Triggering manual build for department: ${deptId}`);
      const downloadUrl = await buildPackForDepartment(deptId);
      console.log(`Successfully built ${deptId}. URL: ${downloadUrl}`);
    } catch (err) {
      console.error(`Failed to build ${deptId}:`, err);
    }
  }
}

main();
