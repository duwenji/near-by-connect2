import { Amplify, ResourcesConfig } from "aws-amplify";
import config from "./config";
import "@aws-amplify/ui-react/styles.css";
import { Authenticator } from "@aws-amplify/ui-react";
import Echo from "./components/echo";
import { AppBar, Avatar, Button, Container, Select, SelectChangeEvent, Toolbar, Typography, MenuItem } from "@mui/material";
import { useEffect, useState } from "react";

import "./App.css";
import { CurrentLocationContext } from "./Contexts";
import EchoEvents from "./components/echo-events";

function App() {
  const [mode, setMode] = useState<"events" | "apigw">("apigw");

  const [currentLocation, setCurrentLocation] = useState<GeolocationCoordinates>();
  
  /// 位置情報の監視を開始する
  function registerGeolocationWatch() {    
    console.log("registerGeolocationWatch");
  
    let watchId: number | undefined;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition((position) => {
        console.log("watchPosition. New Position: ", position);
  
        setCurrentLocation(position.coords);
      },
      error => { () => console.error(error); },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      });
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
    return watchId;
  }

  const handleModeChange = (e: SelectChangeEvent<"events" | "apigw">) => {
    setMode(e.target.value as any);
  };

  const amplifyConfig: ResourcesConfig = {
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
      },
    },
    API: {
      Events: {
        endpoint: config.eventsEndpoint,
        defaultAuthMode: "userPool",
      },
    },
  };
  Amplify.configure(amplifyConfig);

  useEffect(() => { 
    const watchId = registerGeolocationWatch();
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return (
    <>
      <CurrentLocationContext.Provider value={currentLocation}>
        <Authenticator signUpAttributes={["email"]} loginMechanisms={["email"]}>
          {({ signOut, user }) => {
            return (
              <>
                <AppBar position="static">
                  <Toolbar>
                    <Typography variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
                      Real-time events with Cognito authentication
                    </Typography>
                    <Avatar />
                    <Typography sx={{ paddingX: 2 }}>{user == null ? "" : user.username}</Typography>
                    <Button color="inherit" onClick={signOut}>
                      Sign out
                    </Button>
                  </Toolbar>
                </AppBar>
                <main>
                  <Container maxWidth="lg" sx={{ m: 2 }}>
                    <Select value={mode} onChange={handleModeChange}>
                      <MenuItem value={"events"}>AppSync Events</MenuItem>
                      <MenuItem value={"apigw"}>API Gateway WebSocket</MenuItem>
                    </Select>
                    {mode === "events" ? <EchoEvents /> : <Echo />}
                  </Container>
                </main>
              </>
            );
          }}
        </Authenticator>
      </CurrentLocationContext.Provider>
    </>
  );
}

export default App;
