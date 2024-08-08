// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
    indexesOfNearest,
    NormalizedEmbedding,
    SimilarityType,
    generateEmbedding,
    ScoredItem,
    NameValue,
} from "typeagent";
import { TextEmbeddingModel, openai } from "aiclient";

export interface ProgramNameIndex {
    addOrUpdate(programName: string): Promise<void>;
    remove(tabId: number): Promise<void>;
    reset(): Promise<void>;
    search(
        query: string | NormalizedEmbedding,
        maxMatches: number,
    ): Promise<ScoredItem<NameValue<string>>[]>;
}

export function createProgramNameIndex(
    vals: Record<string, string | undefined>,
) {
    let programEmbeddings: Record<string, NormalizedEmbedding> = {};
    let embeddingModel: TextEmbeddingModel;
    const configValues = vals;

    const aiSettings = openai.apiSettingsFromEnv(
        openai.ModelType.Embedding,
        configValues,
    );

    embeddingModel = openai.createEmbeddingModel(aiSettings);

    return {
        addOrUpdate,
        remove,
        reset,
        search,
    };

    async function addOrUpdate(programName: string) {
        try {
            const embedding = await generateEmbedding(
                embeddingModel,
                programName,
            );
            programEmbeddings[programName] = embedding;
        } catch {
            console.log("Could not create embedding for " + programName);
            // TODO: Retry with back-off for 429 responses
        }
    }

    async function remove(tabId: number): Promise<void> {
        if (programEmbeddings[tabId]) {
            delete programEmbeddings[tabId];
        }
    }

    async function reset() {
        programEmbeddings = {};
    }

    async function search(
        query: string | NormalizedEmbedding,
        maxMatches: number,
    ): Promise<ScoredItem<NameValue<string>>[]> {
        const embeddings = Object.values(programEmbeddings);
        const programNames = Object.keys(programEmbeddings);

        const embedding = await generateEmbedding(embeddingModel, query);
        const topN = indexesOfNearest(
            embeddings,
            embedding,
            maxMatches,
            SimilarityType.Cosine,
        );

        return topN.map((m: { item: { toString: () => any }; score: any }) => {
            const itemIndex = Number(m.item);

            return {
                score: m.score,
                item: {
                    name: m.item.toString(),
                    value: programNames[itemIndex],
                },
            };
        });
    }
}