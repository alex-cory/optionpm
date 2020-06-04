import React from "react";
import NumberFormat from "react-number-format";
import PropTypes from "prop-types";
import TextField from "@material-ui/core/TextField";

function NumberFormatCustom(props) {
  const { inputRef, onChange, ...other } = props;

  return (
    <NumberFormat
      {...other}
      getInputRef={inputRef}
      onValueChange={values => {
        onChange({
          target: {
            value: values.value
          }
        });
      }}
      thousandSeparator
      suffix="%"
    />
  );
}

NumberFormatCustom.propTypes = {
  inputRef: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired
};

export default function PercentInput(props) {
  return (
    <TextField
      {...props}
      InputProps={{
        inputComponent: NumberFormatCustom
      }}
    />
  );
}
