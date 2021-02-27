import React, { useState, useRef } from "react";

export default (props) => {
  return (
    <div
      style={{
        position: "absolute",
        transform: "translate(-50%,-50%)",
        top: props.top || "50%",
        left: props.left || "50%",
      }}
    >
      {props.children}
    </div>
  );
};
