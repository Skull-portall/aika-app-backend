const express = require("express");
const router = express.Router();
const {
  getVendors,
  getVendorById,
  getVendorByPhone,
  createVendor,
  updateVendor,
  archiveVendor,
  deleteVendorPermanent,
} = require("../controllers/vendorController");

router.get("/by-phone/:phone", getVendorByPhone);
router.route("/").get(getVendors).post(createVendor);
router.delete("/:id/permanent", deleteVendorPermanent);
router.route("/:id").get(getVendorById).put(updateVendor).delete(archiveVendor);

module.exports = router;

