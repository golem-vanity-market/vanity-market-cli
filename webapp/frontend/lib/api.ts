import { initClient } from "@ts-rest/core";

import { contract } from "@contracts";

export const apiClient = initClient(contract, {
  baseUrl: "http://localhost:3001",
  baseHeaders: {
    Authorization: () => {
      const token = localStorage.getItem("token");
      return token ? `Bearer ${token}` : "";
    },
  },
});
