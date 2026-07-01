const track = (eventName, properties = {}) => {
  try {
    if (window.posthog) {
      window.posthog.capture(eventName, properties);
    }
  } catch {}
};

export const analytics = {
  track,
  identify: (email, name) => {
    try {
      if (window.posthog) {
        window.posthog.identify(email, { email, name });
      }
    } catch {}
  },
};
