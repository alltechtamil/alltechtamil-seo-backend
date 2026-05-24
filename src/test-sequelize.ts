import { User } from './models';
const user = User.build({
  id: '123',
  name: 'Test',
  email: 'test@test.com',
  passwordHash: 'hash',
  role: 'editor',
  avatarUrl: 'url',
  isActive: true,
  lastLoginAt: new Date()
});
console.log(user.toJSON());
