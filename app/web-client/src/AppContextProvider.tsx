/**
 * Copyright (c) 2017-present SIGHUP s.r.l All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

import React, {useCallback, useEffect, useMemo, useState} from "react";
import {ApplicationContext, IApplicationContextData} from "./AppContext";

interface ContextProviderProps {
  children: React.ReactNode
}

interface IK8sContext {
  context: {
    cluster: string;
    user: string;
  }
  name: string;
}

type K8sContextsResponse = IK8sContext[][] | IK8sContext[];

const getDefaultContext = (): IApplicationContextData => {
  return {
    apiUrl: process.env.NODE_ENV !== 'production' ? "http://localhost:5000/" : "",
    currentK8sContext: localStorage.getItem("currentK8sContext") || "",
    k8sContexts: localStorage.getItem("k8sContexts") ?
      JSON.parse(localStorage.getItem("k8sContexts") || "[]") : [],
  };
};

const ContextProvider = ({children}: ContextProviderProps) => {
  const [appContext, setAppContext] = useState<IApplicationContextData>(getDefaultContext());

  const setCurrentContext = useCallback((updates: Partial<IApplicationContextData>) => {
    setAppContext({
      ...appContext,
      ...updates,
    });

    if (updates.currentK8sContext) {
      localStorage.setItem("currentK8sContext", updates.currentK8sContext);
    }

    if (updates.k8sContexts) {
      localStorage.setItem("k8sContexts", JSON.stringify(updates.k8sContexts));
    }
  }, [appContext, setAppContext]);

  const contextValue = useMemo(() => ({
    context: appContext,
    setContext: setCurrentContext
  }), [appContext, setCurrentContext])

  useEffect(() => {
    fetch(`${appContext.apiUrl}api/v1/contexts`)
      .then<K8sContextsResponse>(res => res.json())
      .then(body => {
        if (body.length > 1) {
          const newContexts = (body[0] as IK8sContext[]).map(c => c.name);
          const newCurrentContext = localStorage.getItem("currentK8sContext") || (body[1] as IK8sContext).name;

          localStorage.setItem("k8sContexts", JSON.stringify(newContexts))
          localStorage.setItem("currentK8sContext", newCurrentContext);

          setAppContext({
            ...appContext,
            k8sContexts: newContexts,
            currentK8sContext: newCurrentContext,
          });
        }
      })
      .catch(err => {
        localStorage.removeItem("k8sContexts");
        localStorage.removeItem("currentK8sContext");
        console.error(err);
      })
  }, []);

  return (
    <ApplicationContext.Provider value={contextValue}>
      {children}
    </ApplicationContext.Provider>
  );
};

export default ContextProvider;
