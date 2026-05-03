const express = require('express');
const controller = require('../controllers/campaignController');

const router = express.Router();

router.get('/', controller.listCampaigns);
router.get('/:campaignId', controller.getCampaign);
router.post('/', controller.createCampaign);
router.put('/:campaignId', controller.updateCampaign);
router.delete('/:campaignId', controller.deleteCampaign);
router.post('/:campaignId/messages', controller.addMessage);
router.post('/:campaignId/inventory', controller.addInventoryItem);
router.put('/:campaignId/inventory/:itemId', controller.updateInventoryItem);
router.delete('/:campaignId/inventory/:itemId', controller.deleteInventoryItem);

module.exports = router;
