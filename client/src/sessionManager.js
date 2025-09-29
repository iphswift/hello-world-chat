import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'app_user_id';

// Try to get the user ID from localStorage.
let userId = localStorage.getItem(USER_ID_KEY);

// If it doesn't exist, create a new one and save it.
if (!userId) {
  userId = uuidv4();
  localStorage.setItem(USER_ID_KEY, userId);
  console.log(`New user session started with ID: ${userId}`);
}

// Export a function to get the current user ID.
export function getUserId() {
  return userId;
}