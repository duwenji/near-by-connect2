import { FC, useEffect, useReducer, useState, useContext } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { Typography, Button, TextField, Stack, Box } from "@mui/material";
import { SubmitHandler, useForm } from "react-hook-form";
import config from "../config";

import { CurrentLocationContext } from "../Contexts";

import MapPositionPickerDialog from './PositionPicker';

type EchoInput = {
  latitude: number;
  longitude: number;
  message: string;
};

const Echo: FC = () => {
  const [values, setValues] = useState<EchoInput>({ latitude: 0, longitude: 0, message: "" });

  const { register, handleSubmit, reset } = useForm<EchoInput>({
    defaultValues: { latitude: 0, longitude: 0, message: "" },
    values,
    resetOptions: {
      keepDirtyValues: true, // user-interacted input will be retained
      keepErrors: true, // input errors will be retained with value update
    }
  });

  const [status, setStatus] = useState("initializing");
  const [messages, setMessages] = useState<string[]>([]);
  const [client, setClient] = useState<WebSocket>();
  const [closed, forceClose] = useReducer(() => true, false);
  /// 現在地の状態
  const currentPosition = useContext(CurrentLocationContext);
  const [mapOpen, setMapOpen] = useState(false);

  const handleMapOpen = () => {
    setMapOpen(true);
  };

  const handleMapClose = () => {
    setMapOpen(false);
  };

  const handleMapSelect = (lat: number, long: number): void => {
    console.log(`lat: ${lat}, long: ${long}`);
    
    setValues((prev) => {
      console.log(`prev: ${prev.latitude}, ${prev.longitude}, ${prev.message}`);       
      return {latitude: lat, longitude: long, message: prev.message};
    });
    
    setMapOpen(false);
  };

  const initializeClient = async () => {
    const currentSession = await fetchAuthSession();
    const idToken = currentSession.tokens?.idToken;

    const client = new WebSocket(`${config.apiEndpoint}?idToken=${idToken}`);

    client.onopen = () => {
      setStatus("connected");
    };

    client.onerror = (e: any) => {
      setStatus("error (reconnecting...)");
      console.error(e);

      setTimeout(async () => {
        await initializeClient();
      });
    };

    client.onclose = () => {
      if (!closed) {
        setStatus("closed (reconnecting...)");

        setTimeout(async () => {
          await initializeClient();
        });
      } else {
        setStatus("closed");
      }
    };

    client.onmessage = async (message: any) => {
      const messageStr = JSON.parse(message.data);
      setMessages((prev) => [...prev, messageStr.message]);
    };

    setClient(client);
  };

  const sendMessage: SubmitHandler<EchoInput> = async (input: EchoInput) => {
    console.log(`latitude: ${input.latitude}, longitude: ${input.longitude}, message: ${input.message}`);
    if (client != null) {
      console.log(`sending message: ${input.message}`);
      client.send(input.message);
      reset({ message: "" });
    }
  };

  const handleUserKeyDown = (e: any) => {
    console.log(`key: ${e.key}`);
    console.log(`values: ${values.latitude}, ${values.longitude}, ${values.message}`);       

    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(sendMessage)(); // this won't be triggered
    }
  };

  useEffect(() => {
    initializeClient();
    return () => {
      if (client != null) {
        forceClose();
        client.close();
      }
    };
  }, []);

  return (
    <Stack justifyContent="center" alignItems="center" sx={{ m: 2 }}>
      <Typography variant="h4" gutterBottom>
        WebSocket echo demo
      </Typography>

      <Typography variant="subtitle1" sx={{ color: "#808080" }} gutterBottom>
        status: {status}
      </Typography>

      <Stack direction="row" spacing={2} sx={{ m: 5 }}>
        <Stack direction="column" spacing={2} sx={{ m: 5 }}>
          <Stack direction="row" spacing={2} sx={{ m: 5 }}>
            <TextField
              id="latitude"
              label="経度"
              type="number"
              size="small"
              required
              {...register("latitude")}
              autoComplete="off"
              sx={{ width: 200 }}
              defaultValue={currentPosition?.latitude}
            />
            <TextField
              id="longitude"
              label="緯度"
              type="number"
              size="small"
              required
              {...register("longitude")}
              autoComplete="off"
              sx={{ width: 200 }}
              defaultValue={currentPosition?.longitude}
            />
            <Button variant="contained" color="primary" onClick={handleMapOpen}>
              Pick Location
            </Button>
          </Stack>
          <Stack>
            <MapPositionPickerDialog open={mapOpen} onClose={handleMapClose} onSelect={handleMapSelect} />
          </Stack>
        </Stack>
        <TextField
          id="message"
          label="メッセージ"
          size="small"
          required
          {...register("message")}
          autoComplete="off"
          onKeyDown={handleUserKeyDown}
          sx={{ width: 400 }}
        />
        <Button variant="contained" color="primary" onClick={handleSubmit(sendMessage)}>
          Send
        </Button>
      </Stack>

      <Typography variant="subtitle1" gutterBottom>
        Messages returned from WebSocket server
      </Typography>

      {messages.map((msg) => (
        <Typography sx={{ color: "#808080" }}> {msg}</Typography>
      ))}
    </Stack>
  );
};

export default Echo;
