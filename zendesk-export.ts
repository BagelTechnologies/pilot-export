import {ZendeskClient} from "@sdk-wrappers/ZendeskClient";
import fs from "fs";
import {Parser} from "json2csv";

export const importZendeskToCsv = async (username: string, accessToken: string, subdomain: string, outPrefix: string) => {
  if (!accessToken || !username || !subdomain) {
    throw new Error('missing params')
  }

  const zdClient = new ZendeskClient({
    oauth: false,
    username: username,
    token: accessToken,
    remoteUri: `https://${subdomain}${process.env.ZDESK_API_URI_POSTFIX}`,
  });
  const importInitialDate =  new Date(process.env.CX_IMPORT_FIRST_DATE || "2024-01-01T00:00:00Z")

  const filteredTicketsMap: any = {}
  await zdClient.listTicketsPagedCallback({ since: importInitialDate }, async (tickets: any[], nextPage: string, nextPageTimestamp: number) => {
    console.log(`tickets: ${tickets.length} nextPageTimestamp: ${nextPageTimestamp}`)
    if (tickets?.length === 0) {
      return
    }
    tickets.forEach((ticket: any) => {
      ticket.comments = []
      filteredTicketsMap[ticket.id] = ticket
    })
  })

  await zdClient.listTicketEventsPagedCallback({ since: importInitialDate }, async (events: any[], nextPage: string, nextPageTimestamp: number) => {
    console.log(`events: ${events.length} nextPageTimestamp: ${nextPageTimestamp}`)
    if (events?.length === 0) {
      return
    }
    events.forEach(event => {
      if (event.event_type === 'Comment') {
        if (filteredTicketsMap[event.ticket_id]) {
          filteredTicketsMap[event.ticket_id].comments.push(event)
        }
      } else if (event.child_events?.length > 0) {
        event.child_events?.forEach((childEvent: any) => {
          if (childEvent.type === "Comment") {
            if (filteredTicketsMap[event.ticket_id]) {
              filteredTicketsMap[event.ticket_id].comments.push(event)
            } else {
              console.log(`ticket ids not found for event ${event.id}`)
            }
          }
        })
      }
    })
  })
  const convertJsonToCsv = (jsonObject: any): string => {
    try {
      const fields = Object.keys(jsonObject[0]);
      const opts = { fields, transforms: [(item: any) => {
          for (const key in item) {
            if (typeof item[key] === 'object') {
              item[key] = JSON.stringify(item[key]);
            }
          }
          return item;
        }]};
      const parser = new Parser(opts);
      return parser.parse(jsonObject);
    } catch (err) {
      console.error(`Error converting JSON to CSV`, err);
      return '';
    }
  };

  const saveCsvToFile = (csvString: string, filePath: string): void => {
    try {
      fs.writeFileSync(filePath, csvString);
      console.log(`CSV file saved to ${filePath}`);
    } catch (err) {
      console.error(`Error saving CSV to file`, err);
    }
  };
  const csvString = convertJsonToCsv(Object.values(filteredTicketsMap))
  await saveCsvToFile(csvString, 'output.csv');
}
