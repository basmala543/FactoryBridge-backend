const mongoose = require('mongoose');

const HelpCategorySchema = new mongoose.Schema({
    title: { type: String, required: true }, // مثل: Getting started
    subtitle: { type: String, required: true },
    iconName: { type: String, required: true }, // اسم الأيقونة لاستخدامها في Flutter
    articleCount: { type: String, default: "0 Articles" },
    // قائمة بالمقالات التابعة لهذا القسم
    articles: [{
        question: String,
        answer: String
    }]
});

module.exports = mongoose.model('HelpCategory', HelpCategorySchema);