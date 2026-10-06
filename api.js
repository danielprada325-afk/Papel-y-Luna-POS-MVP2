export class ApiError extends Error {
  constructor(message) {
    super(message);
    this.name = "ApiError";
  }
}

export function isConfigured() {
  return true;
}

export async function apiGet(resource) {
  const response = await fetch(
    `/api?resource=${encodeURIComponent(resource)}`
  );

  const json = await response.json();

  if (!json.success) {
    throw new ApiError(
      json.message || "No fue posible leer los datos."
    );
  }

  return json.data;
}

export async function apiPost(resource, action, data) {
  const response = await fetch(
    `/api?resource=${encodeURIComponent(resource)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action,
        data
      })
    }
  );

  const text = await response.text();

  let json;

  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError(
      "El servidor devolvió una respuesta que no es JSON."
    );
  }

  if (!response.ok || !json.success) {
    throw new ApiError(
      json.message || "No fue posible guardar los datos."
    );
  }

  return json.data;
}