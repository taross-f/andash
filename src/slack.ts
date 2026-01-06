import axios from "axios";
import type { SlackMessage } from "./types";

const SLACK_API_BASE = "https://slack.com/api";

function getSlackClient() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is required for Slack integration");
  }
  return axios.create({
    baseURL: SLACK_API_BASE,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export async function fetchChannelMessages(
  channelId: string,
  limit = 50
): Promise<SlackMessage[]> {
  const client = getSlackClient();

  const resp = await client.get("/conversations.history", {
    params: {
      channel: channelId,
      limit,
    },
  });

  const data = resp.data as {
    ok?: boolean;
    messages?: Array<{
      text?: string;
      user?: string;
      ts?: string;
    }>;
    error?: string;
  };

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error || "unknown error"}`);
  }

  const messages = data.messages || [];
  return messages.map((msg) => ({
    channel: channelId,
    text: msg.text || "",
    user: msg.user,
    timestamp: msg.ts,
  }));
}

export async function fetchThreadMessages(
  channelId: string,
  threadTs: string,
  limit = 50
): Promise<SlackMessage[]> {
  const client = getSlackClient();

  const resp = await client.get("/conversations.replies", {
    params: {
      channel: channelId,
      ts: threadTs,
      limit,
    },
  });

  const data = resp.data as {
    ok?: boolean;
    messages?: Array<{
      text?: string;
      user?: string;
      ts?: string;
    }>;
    error?: string;
  };

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error || "unknown error"}`);
  }

  const messages = data.messages || [];
  return messages.map((msg) => ({
    channel: channelId,
    text: msg.text || "",
    user: msg.user,
    timestamp: msg.ts,
  }));
}

export async function searchSlackMessages(query: string, limit = 20): Promise<SlackMessage[]> {
  const client = getSlackClient();

  const resp = await client.get("/search.messages", {
    params: {
      query,
      count: limit,
    },
  });

  const data = resp.data as {
    ok?: boolean;
    messages?: {
      matches?: Array<{
        channel?: { id?: string };
        text?: string;
        user?: string;
        ts?: string;
      }>;
    };
    error?: string;
  };

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error || "unknown error"}`);
  }

  const matches = data.messages?.matches || [];
  return matches.map((msg) => ({
    channel: msg.channel?.id || "",
    text: msg.text || "",
    user: msg.user,
    timestamp: msg.ts,
  }));
}

export async function listChannels(): Promise<Array<{ id: string; name: string }>> {
  const client = getSlackClient();

  const resp = await client.get("/conversations.list", {
    params: {
      types: "public_channel,private_channel",
      limit: 100,
    },
  });

  const data = resp.data as {
    ok?: boolean;
    channels?: Array<{
      id?: string;
      name?: string;
    }>;
    error?: string;
  };

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error || "unknown error"}`);
  }

  const channels = data.channels || [];
  return channels
    .filter((ch) => ch.id && ch.name)
    .map((ch) => ({
      id: ch.id as string,
      name: ch.name as string,
    }));
}
