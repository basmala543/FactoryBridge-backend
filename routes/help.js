const express = require('express');
const router = express.Router();
const HelpCategory = require('../models/Help');
const Message = require('../models/Message'); // خليناها فوق مع الباقي

// 1. جلب كل أقسام المساعدة
router.get('/categories', async (req, res) => {
    try {
        const categories = await HelpCategory.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. البحث في المقالات
router.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.json([]); // لو مفيش نص بحث، رجع لستة فاضية بدل ما تبحث في الفراغ
    }
    
    try {
        const results = await HelpCategory.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { "articles.question": { $regex: query, $options: 'i' } }
            ]
        });
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. تاريخ الشات (Chat History)
router.get('/chat-history/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const messages = await Message.find({
            $or: [{ senderId: userId }, { receiverId: userId }]
        }).sort({ timestamp: 1 });

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch history" });
    }
});

// 4. إضافة قسم جديد (للاستخدام في Postman لتجهيز البيانات)
router.post('/categories', async (req, res) => {
    const category = new HelpCategory({
        title: req.body.title,
        subtitle: req.body.subtitle,
        iconName: req.body.iconName,
        articleCount: req.body.articleCount,
        articles: req.body.articles
    });

    try {
        const newCategory = await category.save();
        res.status(201).json(newCategory);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET /api/help/support-phone
router.get('/support-phone', (req, res) => {
    // ممكن ترجعي الرقم من الداتا بيز أو مباشرة كدة مؤقتاً
    res.status(200).json({ 
        phoneNumber: "+201234567890", 
        availableHours: "9 AM - 9 PM" 
    });
});
module.exports = router;