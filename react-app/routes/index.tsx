import { useEffect, useState } from "preact/hooks";

import { Head } from "$fresh/runtime.ts";

const uuid = () => crypto.randomUUID();

type PublicKey = string;
type SecretKey = string;

const getPublicKey = (secretKey: SecretKey): PublicKey =>
  "public key for" + secretKey;

type AppEvent = ChatMessage | Decision | LikeAck | ChatAck | Profile | Match;
type ChatMessage = {
  type: "chat";
  text: string;
  sender: PublicKey;
  recipient: PublicKey;
  timestamp: number;
  id: string;
};
type Decision = {
  type: "decision";
  target: PublicKey;
  like: boolean;
  timestamp: number;
  id: string;
};
type LikeAck = {
  type: "decision-ack";
  acking: string;
  timestamp: number;
  id: string;
};
type ChatAck = {
  type: "chat-ack";
  acking: string;
  timestamp: number;
  id: string;
};
type Profile = {
  type: "profile";
  publicKey: PublicKey;
  name: string;
  description: string;
  timestamp: number;
  id: string;
};
type Match = {
  type: "match";
  peer: PublicKey;
  timestamp: number;
  id: string;
};

const getTimestamp = (): number => new Date().getTime();

const chooseNextProfile = (events: AppEvent[]): Profile | null => {
  const decisions = events.filter(
    ({ type }) => type === "decision",
  ) as Decision[];
  const profilesDecidedOn = new Set(decisions.map(({ target }) => target));
  const profiles = events.filter(({ type }) => type === "profile") as Profile[];
  return (
    profiles.find(({ publicKey }) => !profilesDecidedOn.has(publicKey)) || null
  );
};

const ProfileComponent = ({
  profile: { name, description, timestamp },
  like,
  unlike,
}: {
  profile: Profile;
  like: () => void;
  unlike: () => void;
}) => {
  return (
    <div>
      name: {name}
      description: {description}
      last updated: {timestamp}
      <button onClick={like}>like</button>
      <button onClick={unlike}>unlike</button>
    </div>
  );
};

const Matches = ({ events }: { events: AppEvent[] }) => {
  const matches = events.filter(({ type }) => type === "match") as Match[];
  return (
    <div>
      <h2>Matches</h2>
      {matches.map(({ peer }) => (
        <div>{peer}</div>
      ))}
    </div>
  );
};

// const useExternal = (f) => {
// console.error("not yet implemented");
// };

const profileToDecision = (
  { publicKey }: Profile,
  decision: boolean,
): Decision => ({
  type: "decision",
  timestamp: getTimestamp(),
  target: publicKey,
  like: decision,
  id: uuid(),
});

const Chat = ({
  peer,
  events,
  sendChat,
}: {
  sendChat: (text: string, peer: PublicKey) => void;
  peer: PublicKey;
  events: AppEvent[];
}) => {
  const [text, setText] = useState("");
  const chats = events.filter(
    (event) =>
      event.type === "chat" &&
      (event.sender === peer || event.recipient === peer),
  ) as ChatMessage[];
  return (
    <div>
      {chats
        .sort((x, y) => x.timestamp - y.timestamp)
        .map(({ sender, text, timestamp }: ChatMessage) => (
          <div>
            {sender} said {text} at {timestamp}
          </div>
        ))}
      <input
        value={text}
        onChange={(e) => setText((e.target as HTMLInputElement).value)}
      />
      <button
        onClick={() => {
          sendChat(text, peer);
        }}
      >
        send
      </button>
    </div>
  );
};

const makeChatEvent = (
  sender: PublicKey,
  text: string,
  recipient: PublicKey,
): ChatMessage => ({
  type: "chat",
  timestamp: getTimestamp(),
  id: uuid(),
  text,
  recipient,
  sender,
});
export default function Home() {
  const secretKey = "asd";
  const [events, setEvents] = useState<AppEvent[]>([]);
  // const [tasks, setTasks] = useState([]);

  // useExternal((handler) => {
  //   anonMatchRgisterHandler(secretKey, (e: ChatMessage | Profile) => {
  //     addEvent(e);
  //   });
  // });

  // useEffect(() => {}, [tasks]);

  const profile = chooseNextProfile(events);
  const chatPeer = null;
  return (
    <>
      <Head>
        <title>PeerMatch</title>
      </Head>
      <Matches events={events} />
      {profile && (
        <ProfileComponent
          like={() => {
            setEvents([...events, profileToDecision(profile, true)]);
          }}
          unlike={() => {
            setEvents([...events, profileToDecision(profile, false)]);
          }}
          profile={profile}
        />
      )}
      {chatPeer && (
        <Chat
          peer={chatPeer}
          sendChat={(text: string, recipient: PublicKey) => {
            setEvents([
              ...events,
              makeChatEvent(getPublicKey(secretKey), text, recipient),
            ]);
          }}
          events={events}
        />
      )}
    </>
  );
}
