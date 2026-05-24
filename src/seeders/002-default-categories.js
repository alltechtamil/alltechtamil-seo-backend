'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const categories = [
      {
        id: uuidv4(),
        name: 'Technology',
        slug: 'technology',
        description: 'Latest technology updates, gadgets review, and tech news.',
        meta_title: 'Technology News & Updates | AllTechTamil',
        meta_description:
          'Stay ahead with the latest technology updates, gadget reviews, and trending tech news in Tamil.',
        is_active: true,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Programming',
        slug: 'programming',
        description: 'Web development, coding tutorials, tips, and programming guidelines.',
        meta_title: 'Programming & Web Development Tutorials | AllTechTamil',
        meta_description: 'Learn modern programming languages, software architecture, and web development guidelines.',
        is_active: true,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Android',
        slug: 'android',
        description: 'Android app reviews, custom ROMs, customization, and updates.',
        meta_title: 'Android Apps, ROMs & Customization | AllTechTamil',
        meta_description: 'Explore Android applications, mobile hacks, customization tips, and root guides.',
        is_active: true,
        sort_order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Reviews',
        slug: 'reviews',
        description: 'Unbiased and in-depth product, smartphone, and service reviews.',
        meta_title: 'Tech Product & Smartphone Reviews | AllTechTamil',
        meta_description: 'Read unbiased and thorough reviews of the latest smartphones, gadgets, and software.',
        is_active: true,
        sort_order: 4,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Tutorials',
        slug: 'tutorials',
        description: 'Step-by-step guides, how-to tutorials, and tech solutions.',
        meta_title: 'How-To Guides & Tech Tutorials | AllTechTamil',
        meta_description: 'Detailed step-by-step tech guides, smart how-tos, and troubleshooting solutions.',
        is_active: true,
        sort_order: 5,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'AI & ML',
        slug: 'ai-ml',
        description: 'Artificial Intelligence, Machine Learning, and future technology trends.',
        meta_title: 'AI, Machine Learning & Future Tech | AllTechTamil',
        meta_description:
          'Discover the latest breakthroughs in Artificial Intelligence, Machine Learning, and robotics.',
        is_active: true,
        sort_order: 6,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('categories', categories, {});
  },

  async down(queryInterface, Sequelize) {
    const Op = Sequelize.Op;
    await queryInterface.bulkDelete(
      'categories',
      {
        slug: {
          [Op.in]: ['technology', 'programming', 'android', 'reviews', 'tutorials', 'ai-ml'],
        },
      },
      {}
    );
  },
};
