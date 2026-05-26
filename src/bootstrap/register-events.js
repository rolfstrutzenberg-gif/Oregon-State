function registerEvents(client, events) {
  for (const event of events) {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
      continue;
    }

    client.on(event.name, (...args) => event.execute(...args));
  }
}

module.exports = {
  registerEvents,
};
