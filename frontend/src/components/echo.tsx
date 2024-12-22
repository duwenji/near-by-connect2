import { FC, useEffect, useReducer, useState, useContext } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { Typography, Button, TextField, Stack, Box } from "@mui/material";
import { SubmitHandler, useForm, useFieldArray } from "react-hook-form";
import { DevTool } from "@hookform/devtools";
import config from "../config";

import { CurrentLocationContext } from "../Contexts";

import MapPositionPickerDialog from './PositionPicker';

type EchoInput = {
  location: {
    latitude: number;
    longitude: number;  
  };
  message: string;
  favorites: {
    name: string;
  }[];
};

let renderCount = 0;

const Echo: FC = () => {
  /// 現在地の状態
  const currentPosition = useContext(CurrentLocationContext);

  const [values, setValues] = useState<EchoInput>({
    location: {
      latitude: 0, 
      longitude: 0
    }, 
    message: "",
    favorites: [
      {name: ""}
    ]
  });

  const { register, handleSubmit, reset, control, formState } = useForm<EchoInput>({
    defaultValues: values,
    values
  });
  const { errors } = formState;

  const { fields, append, remove } = useFieldArray({
    name: "favorites",
    control
  });

  const [status, setStatus] = useState("initializing");
  const [messages, setMessages] = useState<string[]>([]);
  const [client, setClient] = useState<WebSocket>();
  const [closed, forceClose] = useReducer(() => true, false);
  const [mapOpen, setMapOpen] = useState(false);

  const handleMapOpen = () => {
    setMapOpen(true);
  };

  const handleMapClose = () => {
    setMapOpen(false);
  };

  const handleMapSelect = (lat: number, long: number): void => {
    console.log(`lat: ${lat}, long: ${long}`);
    
    setValues({...values, 
      location: {
        latitude: lat, 
        longitude: long
      }
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
    console.log("sendMessage...", input);
    if (client != null) {
      console.log(`sending message: ${input.message}`);
      client.send(input.message);
      reset({ message: "" });
    }
  };

  const handleUserKeyDown = (e: any) => {
    console.log(`key: ${e.key}`);
    console.log(`values: ${values.location.latitude}, ${values.location.longitude}, ${values.message}`);       

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

  renderCount++;

  return (
    <Stack justifyContent="center" alignItems="center" sx={{ m: 2 }}>
      <Typography variant="h4" gutterBottom>
        WebSocket echo demo ({ renderCount / 2 })
      </Typography>

      <Typography variant="subtitle1" sx={{ color: "#808080" }} gutterBottom>
        status: {status}
      </Typography>
      <form onSubmit={handleSubmit(sendMessage)} noValidate>
        <Stack direction="row" spacing={2} sx={{ m: 5 }}>
          <TextField
            id="longitude"
            label="経度"
            type="number"
            size="small"
            {...register("location.longitude", {
              required: {
                value: true,
                message: "経度が必須です。"
              }, 
            })}
            autoComplete="off"
            sx={{ width: 300 }}
          />
          <p>{errors.location?.longitude?.message}</p>
          <TextField
            id="latitude"
            label="緯度"
            type="number"
            size="small"
            {...register("location.latitude", {
              required: {
                value: true,
                message: "緯度が必須です。"
              }, 
            })}
            autoComplete="off"
            sx={{ width: 300 }}
          />
          {/* <p>{errors.location.latitude?.message}</p> */}
          <Button variant="contained" color="primary" onClick={handleMapOpen}>
            Pick Location
          </Button>
          <MapPositionPickerDialog open={mapOpen} onClose={handleMapClose} onSelect={handleMapSelect} />
          <TextField
            id="message"
            label="メッセージ"
            size="small"
            required
            {...register("message", {
              required: {
                value: true,
                message: "メッセージが必須です。"
              }, 
            })}
            autoComplete="off"
            onKeyDown={handleUserKeyDown}
            sx={{ width: 400 }}
          />
          <p>{errors.message?.message}</p>

          <div>
            <label>嗜好情報</label>
            <div>
              {fields.map((field: { id: string }, index: number) => (
                <div key={field.id}>
                  <TextField
                  id={`favorites.${index}`}
                  label={`嗜好情報-${index + 1}`}
                  size="small"
                  required
                  {...register(`favorites.${index}.name` as const)}
                  autoComplete="off"
                  sx={{ width: 400 }}
                  />
                  <Button
                  type="button"
                  onClick={() => remove(index)}
                  >
                  削除
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => append({ name: "" })}
              >
                追加
              </Button>
            </div>
          </div>

          <Button variant="contained" color="primary" type="submit">
            Send
          </Button>
        </Stack>
      </form>

      <Typography variant="subtitle1" gutterBottom>
        Messages returned from WebSocket server
      </Typography>

      {messages.map((msg) => (
        <Typography sx={{ color: "#808080" }}> {msg}</Typography>
      ))}

      <DevTool control={control} placement="top-right" />
    </Stack>
  );
};

export default Echo;
