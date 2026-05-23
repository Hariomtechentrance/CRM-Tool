import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireOrgContext } from "../middleware/orgContext";
import {
  listParties, getParty, createParty, updateParty, deleteParty,
  listContacts, createContact, updateContact, deleteContact,
  listCommunications, createCommunication, deleteCommunication,
  listAllCommunications, getCrmStats, bulkImportParties,
} from "../controllers/party.controller";

const router = Router();

router.use(authenticate, requireOrgContext);

// Stats
router.get("/stats", getCrmStats);

// Bulk import
router.post("/bulk-import", bulkImportParties);

// Party CRUD
router.get("/",          listParties);
router.post("/",         createParty);
router.get("/:id",       getParty);
router.patch("/:id",     updateParty);
router.delete("/:id",    deleteParty);

// Contacts
router.get("/:id/contacts",                  listContacts);
router.post("/:id/contacts",                 createContact);
router.patch("/:id/contacts/:contactId",     updateContact);
router.delete("/:id/contacts/:contactId",    deleteContact);

// Org-wide communications (for Activities page)
router.get("/communications",                listAllCommunications);

// Communication log
router.get("/:id/communications",            listCommunications);
router.post("/:id/communications",           createCommunication);
router.delete("/:id/communications/:commId", deleteCommunication);

export default router;
