import React from "react";
import ReactDOM from "react-dom/client";
import { I18nProvider } from "@lingui/react";
import { App } from "./app/App";
import { activateLocale, i18n } from "@/shared/i18n";
import "@/shared/styles/globals.css";

activateLocale();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider i18n={i18n}>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
