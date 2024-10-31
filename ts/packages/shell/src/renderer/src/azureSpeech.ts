// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as sdk from "microsoft-cognitiveservices-speech-sdk";
//import * as msal from "@azure/msal-browser";
//import { SPAAuthRedirect } from "./auth/authRedirect.js";
import { SPAAuthPopup } from "./auth/authPopup.js";
//import { auth } from "aiclient";

export interface TokenResponse {
    token: string;
    expire: number;
    region: string;
    endpoint: string;
}

const defaultVoiceName = "en-US-RogerNeural";
const defaultVoiceStyle = "chat";
const IdentityApiKey = "identity";
// const azureTokenProvider = auth.createAzureTokenProvider(
//     auth.AzureTokenScopes.CogServices,
// );

export class AzureSpeech {
    private static instance: AzureSpeech;
    private token: string = "";
    public static  IsInitialized(): boolean {
        return AzureSpeech.instance !== undefined;
    }

    private constructor(
        private readonly subscriptionKey: string,
        private readonly region: string,
        private readonly endpoint: string,
    ) {
        // ...
    }

    public get Region() {
        return this.region;
    }

    public get Endpoint() {
        return this.endpoint;
    }

    public static initializeAsync = async (config: {
        azureSpeechSubscriptionKey: string;
        azureSpeechRegion: string;
        azureSpeechEndpoint: string;
    }): Promise<void> => {
        if (AzureSpeech.instance) {
            return;
        }
        const {
            azureSpeechSubscriptionKey,
            azureSpeechRegion,
            azureSpeechEndpoint: azureSpeechEndpoint,
        } = config;
        AzureSpeech.instance = new AzureSpeech(
            azureSpeechSubscriptionKey,
            azureSpeechRegion,
            azureSpeechEndpoint,
        );
    };

    public static getInstance = (): AzureSpeech => {
        if (!AzureSpeech.instance) {
            throw new Error("AzureSpeech: not initialized");
        }
        return AzureSpeech.instance;
    };

    public getTokenAsync = async (): Promise<TokenResponse> => {
        let result: TokenResponse;

        // if (
        //     this.subscriptionKey.toLowerCase() == IdentityApiKey.toLowerCase()
        // ) {
        //     result = await this.getIdentityBasedTokenAsync();
        // } else {
        //     result = await this.getKeyBasedTokenAsync();
        // }

        result = await this.getBrowserTokenAsync();

        this.token = result.token;

        return result;
    };

    // private getIdentityBasedTokenAsync = async (): Promise<TokenResponse> => {
    //     const tokenResult: Result<string> = 
    //        success("sdlf"); //await azureTokenProvider.getAccessToken();

    //     if (!tokenResult.success) {
    //         throw new Error(
    //             `AzureSpeech: getIdentityBasedTokenAsync: Failed to get identity based token! tokenResult: ${tokenResult}`,
    //         );
    //     }

    //     const result: TokenResponse = {
    //         token: tokenResult.data,
    //         region: this.region,
    //         endpoint: this.endpoint,
    //     };

    //     return result;
    // };

    public getBrowserTokenAsync = async (): Promise<TokenResponse> => {
        
        // let silent: msal.SsoSilentRequest = msal.SsoSilentRequest.
        // authProvider.ssoSilent(new msal.sso).
        //     then((response) => {
        //         const result: TokenResponse = {
        //             token: tokenResult.data,
        //             region: this.region,
        //             endpoint: this.endpoint,
        //         };
        
        //         return result;
        //     }).catch(error => {
        //         console.error("Silent Error: " + error);
        //         if (error instanceof msal.InteractionRequiredAuthError) {
        //             console.log("user must login again, interaction required");
        //         }
        //     });

        //const loginResult: msal.AuthenticationResult | undefined | void = await SPAAuthRedirect.getInstance().getToken();
 
        // if (loginResult) {
        //     const result: TokenResponse = {
        //         token: loginResult.accessToken,
        //         expire: Number(loginResult.expiresOn),
        //         region: this.region,
        //         endpoint: this.endpoint,
        //     };

        //     return result;
        // }
        
        // return { token: "", expire: Date.now(), region: this.region, endpoint: this.endpoint};
        

        return new Promise<TokenResponse>(async (resolve) => {
            resolve(await SPAAuthPopup.getInstance().getToken());
        });
    };

    // private getKeyBasedTokenAsync = async (): Promise<TokenResponse> => {
    //     const options: RequestInit = {
    //         method: "POST",
    //         headers: new Headers({
    //             "Content-Type": "application/x-www-form-urlencoded",
    //             "Ocp-Apim-Subscription-Key": this.subscriptionKey,
    //         }),
    //     };

    //     const tokenEndpoint = `https://${this.region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`;
    //     const response = await fetch(tokenEndpoint, options);
    //     if (!response.ok) {
    //         throw new Error(
    //             `AzureSpeech: getTokenAsync: ${response.status} ${response.statusText}`,
    //         );
    //     }

    //     const result: TokenResponse = {
    //         token: await response.text(),
    //         region: this.region,
    //         endpoint: this.endpoint,
    //     };

    //     return result;
    // };

    public getTextToSpeechAsync = async (
        text: string,
        voiceName?: string,
        voiceStyle?: string,
    ) => {
        let speechConfig = sdk.SpeechConfig.fromSubscription(
            this.subscriptionKey,
            this.region,
        );

        if (
            this.subscriptionKey.toLowerCase() == IdentityApiKey.toLowerCase()
        ) {
            speechConfig = sdk.SpeechConfig.fromAuthorizationToken(
                `aad#${this.endpoint}#${this.token}`,
                this.region,
            );
        }

        const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

        const ssml = `
        <speak
            version='1.0'
            xmlns='http://www.w3.org/2001/10/synthesis'
            xmlns:mstts='https://www.w3.org/2001/mstts'
            xml:lang='en-US'
        >
            <voice name='${voiceName ?? defaultVoiceName}'>
                <mstts:express-as style='${voiceStyle ?? defaultVoiceStyle}'>
                    ${text}
                </mstts:express-as>
            </voice>
        </speak>`;

        return await new Promise<string>((resolve, reject) => {
            synthesizer.speakSsmlAsync(
                ssml,
                (result) => {
                    const { audioData } = result;
                    synthesizer.close();

                    const buffer = Buffer.from(audioData);
                    resolve(buffer.toString("base64"));
                },
                (error) => {
                    synthesizer.close();
                    reject(error);
                },
            );
        });
    };
}