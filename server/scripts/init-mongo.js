// MongoDB initialization script
db = db.getSiblingDB('videomate');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'username'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 30
        },
        password: {
          bsonType: 'string',
          minLength: 6
        }
      }
    }
  }
});

db.createCollection('files');
db.createCollection('folders');
db.createCollection('purchases');
db.createCollection('subscriptions');
db.createCollection('transactions');
db.createCollection('notifications');
db.createCollection('issues');
db.createCollection('contactmessages');
db.createCollection('admins');
db.createCollection('subscriptionplans');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.files.createIndex({ userId: 1 });
db.files.createIndex({ folderId: 1 });
db.purchases.createIndex({ userId: 1 });
db.purchases.createIndex({ fileId: 1 });
db.subscriptions.createIndex({ userId: 1 });
db.transactions.createIndex({ userId: 1 });
db.notifications.createIndex({ userId: 1 });
db.issues.createIndex({ userId: 1 });

print('Database initialized successfully!');
