import { googleAuth } from './src/services/authService';

async function main() {
  try {
    const res = await googleAuth({
      email: 'test@example.com',
      name: 'Test User'
    });
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
main();
