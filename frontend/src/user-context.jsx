import { createContext, useState, useEffect } from "react";

const initialUserState = {
  email: '',
  password: '',
  role: '',
  authenticated: false,
  accessToken: '',
  refreshToken: '',
  showRoles: false,
  credentials: null,
};

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(initialUserState);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.authenticated) {
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage: ', error);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  return (
    <UserContext.Provider value={[user, setUser]}>
      {children}
    </UserContext.Provider> 
  );
}

export default UserContext;