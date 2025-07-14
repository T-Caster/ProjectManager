import { createContext, useContext } from "react";

export const AuthUserContext = createContext(null);

export const useAuthUser = () => useContext(AuthUserContext);