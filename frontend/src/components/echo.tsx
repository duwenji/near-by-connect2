import { FC, useEffect, useReducer, useState, useContext } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { Typography, Button, TextField, Stack, Box } from "@mui/material";
import { SubmitHandler, useForm, useFieldArray, FieldErrors } from "react-hook-form";
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

  const { register, handleSubmit, reset, control, formState, getValues, setValue, trigger } = useForm<EchoInput>({
    defaultValues: {
      location: {
        latitude: undefined, 
        longitude: undefined
      }, 
      message: "",
      favorites: [
        {name: ""}
      ]
    },
    mode: "onBlur",
  });
  const { errors, isDirty, isValid, isSubmitting, isSubmitted, isSubmitSuccessful, submitCount } = formState;

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
    
    setValue("location.longitude", long, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue("location.latitude", lat, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
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

  const onSubmit: SubmitHandler<EchoInput> = async (input: EchoInput) => {
    console.log("onSubmit...", input);
    if (client != null) {
      console.log(`sending message: ${input.message}`);
      client.send(input.message);
    }
  };

  const onError = (errors: FieldErrors) => {
    console.log("errors...", errors);
  };

  const handleUserKeyDown = (e: any) => {
    console.log(`key: ${e.key}`);

    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(onSubmit)(); // this won't be triggered
    }
  };

  const handleGetValues = () => {
    console.log("handleGetValues...", getValues());
  }

  useEffect(() => {
    initializeClient();
    return () => {
      if (client != null) {
        forceClose();
        client.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isSubmitSuccessful) {
      console.log("resetting form...");
      reset();
    }
  }, [isSubmitSuccessful, reset]);

  renderCount++;

  return (
    <Stack justifyContent="center" alignItems="center" sx={{ m: 2 }}>
      <Typography variant="h4" gutterBottom>
        WebSocket echo demo ({ renderCount / 2 })
      </Typography>

      <Typography variant="subtitle1" sx={{ color: "#808080" }} gutterBottom>
        status: {status}
      </Typography>
      <form onSubmit={handleSubmit(onSubmit, onError)} noValidate>
        <Stack direction="column" spacing={2} sx={{ m: 5 }}>
          <TextField
            id="longitude"
            label="経度"
            type="number"
            size="small"
            {...register("location.longitude", {
              valueAsNumber: true,
              required: {
                value: true,
                message: "経度が必須です。"
              }, 
            })}
            autoComplete="off"
            sx={{ width: 300 }}
            error={errors.location?.longitude ? true : false}
            helperText={errors.location?.longitude?.message}
          />
          <TextField
            id="latitude"
            label="緯度"
            type="number"
            size="small"
            {...register("location.latitude", {
              valueAsNumber: true,
              required: {
                value: true,
                message: "緯度が必須です。"
              }, 
            })}
            autoComplete="off"
            sx={{ width: 300 }}
            error={errors.location?.latitude ? true : false}
            helperText={errors.location?.latitude?.message}
          />
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
            error={errors.message ? true : false}
            helperText={errors.message?.message}
          />

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

          <Button variant="contained" color="primary" type="submit"
            disabled={!isDirty || !isValid || isSubmitting}>
            Send
          </Button>
          <Button variant="contained" color="secondary" type="button" 
            disabled={!isDirty || !isValid || isSubmitting} 
            onClick={() => reset()}>
            Reset
          </Button>
          <Button variant="contained" color="secondary" type="button" onClick={handleGetValues}>
            Get Values
          </Button>
          <Button variant="contained" color="secondary" type="button" onClick={() => trigger()}>
            Validate
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
