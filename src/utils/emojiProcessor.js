// src/utils/emojiProcessor.js

export const processOpenMoji = (rawJsonData) => {
    // Structure 1: For the visible picker (categorized display)
    const categories = {
        'Recent': ['😀', '😂', '😍', '👍', '🔥', '💯', '🙏', '🥳', '🤔', '😎'] 
    };

    // Structure 2: For Search (keyword to emoji mapping)
    const searchIndex = {}; // Format: { keyword: [emoji1, emoji2, ...] }

    rawJsonData.forEach(item => {
        const emoji = item.emoji;
        const group = item.group;
        const annotation = item.annotation.toLowerCase(); // Full descriptive name
        const tags = item.tags ? item.tags.toLowerCase().split(', ') : []; // Array of keywords

        // --- Populate Categories (Existing Logic) ---
        let categoryName = group.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        if (!categories[categoryName]) {
            categories[categoryName] = [];
        }
        categories[categoryName].push(emoji);

        // --- Populate Search Index (New Logic) ---
        
        // Combine the annotation and tags into a single set of keywords
        const keywords = new Set([annotation, ...tags]);
        
        keywords.forEach(keyword => {
            if (!searchIndex[keyword]) {
                searchIndex[keyword] = [];
            }
            // Add the emoji to the list for this keyword
            searchIndex[keyword].push(emoji);
        });
    });

    // Return both structures
    return { categorizedEmojis: categories, searchIndex: searchIndex };
};