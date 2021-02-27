import React, { useState, useRef } from "react";
import {observer} from "mobx-react";

import { Form, FormField, TextInput, Button, Box } from "grommet";
import { login } from "../controller/user";

export default () => {
  const [value, setValue] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);

  return (
    <Box
      direction="row"
      background="dark-3"
      pad="medium"
      round="medium"
    >
      <Form
        value={value}
        onChange={(nextValue) => setValue(nextValue)}
        onReset={() => setValue({})}
        onSubmit={({ value }) => {}}
      >
        <FormField name="name" htmlFor="text-input-id" label="Name">
          <TextInput id="text-input-id" disabled={loggingIn} name="name" />
        </FormField>

        <Box direction="row" gap="medium">
          <Button type="submit" size="medium" primary disabled={loggingIn} label="Connect" onClick={async () => {
            if (loggingIn) {
              return;
            }
            setLoggingIn(true);
            await login(value.name, null);
            setLoggingIn(false);
          }} />
          <Button type="reset" size="medium" label="Reset" />
        </Box>
      </Form>
    </Box>
  );
};
