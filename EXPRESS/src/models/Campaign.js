const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

const memorySchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['campaign', 'character', 'npc', 'location', 'quest', 'item', 'fact'],
      default: 'fact',
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      default: 'scene',
      trim: true,
    },
    lastReinforcedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    playerName: {
      type: String,
      required: true,
      trim: true,
    },
    characterName: {
      type: String,
      required: true,
      trim: true,
    },
    campaignIdea: {
      type: String,
      required: true,
      trim: true,
    },
    tone: {
      type: String,
      default: 'Heroic fantasy with dramatic choices',
      trim: true,
    },
    playStyle: {
      type: String,
      default: 'Roleplay-first adventure',
      trim: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    memories: {
      type: [memorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Campaign', campaignSchema);
