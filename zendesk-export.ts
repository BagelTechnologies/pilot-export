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
  // const ticketFields = await zdClient.listTicketFields()
  // if (ticketFields.length > 0) {
  //   console.log(`writing ticket fields to ${outPrefix}-ticket-fields.json`)
  //   const ticketFieldsFilePath = `${outPrefix}-ticket-fields.json`
  //   await fs.writeFile(ticketFieldsFilePath, JSON.stringify(ticketFields))
  // }
  // const includeIf = {
  //   '26532214635789': [
  //     'pc_engage_accounts_tab',
  //     'pc_engage_analytics_tab',
  //     'pc_engage_calendaring_and_calendaring_integrations',
  //     'pc_engage_calls_dialer',
  //     'pc_engage_configurations_and_settings',
  //     'pc_engage_flows_tab',
  //     'pc_engage_messages_and_templates',
  //     'pc_engage_people_tab',
  //     'pc_engage_pipeline',
  //     'pc_engage_to_do'],
  //   '360038974152': [
  //     'pc_engage_accounts',
  //     'pc_engage_activity_sync',
  //     'pc_engage_analytics',
  //     'pc_engage_calls',
  //     'pc_engage_contacts',
  //     'pc_engage_emails',
  //     'pc_engage_flows',
  //     'pc_engage_people',
  //     'pc_engage_recommendations',
  //     'pc_engage_templates',
  //     'pc_engage_to-dos'
  //   ]
  // }
  //To filter out non relevant ticket events
  const ticketIds: number[] = []
  const filteredTickets: any[] = []
  const filteredTicketsMap: any = {}
  await zdClient.listTicketsPagedCallback({ since: importInitialDate }, async (tickets: any[], nextPage: string, nextPageTimestamp: number) => {
    console.log(`tickets: ${tickets.length} nextPageTimestamp: ${nextPageTimestamp}`)
    if (tickets?.length === 0) {
      return
    }
    //To filter by chosen custom fields
    // const filtered = tickets.filter(ticket => {
    //   ticketIds.push(ticket.id)
    //   return ticket.custom_fields.some((field: any) => {
    //     return includeIf['26532214635789'].includes(field.value) || includeIf['360038974152'].includes(field.value)
    //   })
    // })
    filteredTickets.push(...tickets);
  })
  filteredTickets.forEach((ticket: any) => {
    filteredTicketsMap[ticket.id] = ticket
  })
  await zdClient.listTicketEventsPagedCallback({ since: importInitialDate }, async (events: any[], nextPage: string, nextPageTimestamp: number) => {
    console.log(`events: ${events.length} nextPageTimestamp: ${nextPageTimestamp}`)
    if (events?.length === 0) {
      return
    }
    events.forEach(event => {
      if (event.event_type === 'Comment') {
        if (filteredTicketsMap[event.ticket_id]) {
          if (!filteredTicketsMap[event.ticket_id].comments) {
            filteredTicketsMap[event.ticket_id].comments = []
          }
          filteredTicketsMap[event.ticket_id].comments.push(event)
        }
      } else if (event.child_events?.length > 0) {
        event.child_events?.forEach((childEvent: any) => {
          if (childEvent.type === "Comment") {
            if (filteredTicketsMap[event.ticket_id]) {
              if (!filteredTicketsMap[event.ticket_id].comments) {
                filteredTicketsMap[event.ticket_id].comments = []
              }
              filteredTicketsMap[event.ticket_id].comments.push(event)
            }
          }
        })
      }
    })
    // const ticketsEventsFilePath = `${outPrefix}-tickets-events-${nextPageTimestamp}.json`
    // console.log(`writing tickets events to ${ticketsEventsFilePath}`)
    // await fs.writeFile(ticketsEventsFilePath, JSON.stringify(events))
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
