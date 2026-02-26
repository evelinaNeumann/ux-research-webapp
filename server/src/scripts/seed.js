import bcrypt from 'bcryptjs';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { Study } from '../models/Study.js';
import { Question } from '../models/Question.js';
import { Card } from '../models/Card.js';

async function seed() {
  await connectDb();

  const adminUsername = 'admin';
  const adminPassword = 'Admin12345!';
  const exists = await User.findOne({ username: adminUsername });

  if (!exists) {
    const password_hash = await bcrypt.hash(adminPassword, 12);
    await User.create({ username: adminUsername, password_hash, role: 'admin' });
    console.log('Created admin:', adminUsername, adminPassword);
  }

  let study = await Study.findOne({ name: 'Demo Study' });
  if (!study) {
    study = await Study.create({
      name: 'Demo Study',
      type: 'mixed',
      is_active: true,
      module_order: ['questionnaire', 'card_sort', 'image_rating'],
    });

    await Question.create({
      study_id: study._id,
      text: 'Wie klar war die Startseite?',
      type: 'likert',
      options: ['1', '2', '3', '4', '5'],
      required: true,
      version: study.version,
    });

    await Card.insertMany([
      { study_id: study._id, label: 'Navigation', version: study.version },
      { study_id: study._id, label: 'Suche', version: study.version },
      { study_id: study._id, label: 'Profil', version: study.version },
    ]);

    console.log('Created Demo Study');
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
