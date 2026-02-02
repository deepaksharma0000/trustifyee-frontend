// src/utils/auth.ts
export const getLoggedInUser = () => {
  try {
    const user = localStorage.getItem('authUser');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};
