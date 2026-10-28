import { useState } from "react";

export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const bind = (name) => ({
    id: name,
    name,
    value: values[name] ?? "",
    onChange: (e) => {
      const value = e.target.value;
      setValues((v) => ({ ...v, [name]: value }));
      setErrors((x) => ({ ...x, [name]: undefined }));
    },
  });
  return { values, setValues, errors, setErrors, bind };
}
