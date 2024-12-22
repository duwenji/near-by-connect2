import { createContext } from "react";



export const CurrentLocationContext = createContext<GeolocationCoordinates | undefined>(undefined);
