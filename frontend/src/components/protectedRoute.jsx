import { useContext } from "react";
import { Navigate } from "react-router-dom";
import UserContext from "../user-context";

export default function ProtectedRoute({ children }) {
  const [user] = useContext(UserContext);

  if (!user?.authenticated) {
    return <Navigate to="/login" />;
  }

  return children;
}