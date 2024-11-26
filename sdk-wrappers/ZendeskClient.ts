/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as ZendeskSdk from "node-zendesk";

interface ZenDeskClientOptions {
  oauth: boolean;
  token:     string;
  remoteUri: string;
  username?: string;
}
const DEFAULT_FIRST_IMPORT_DATE = new Date("2024-01-01T00:00:00Z")
export class ZendeskClient {
  private sdk: ZendeskSdk.Client;
  private options: ZenDeskClientOptions;
  public constructor(options: ZenDeskClientOptions) {
    this.options = options;
    const throttle = {
      window: 60,
      limit: 20
    };
    if (!this.options.oauth) {
      if (!this.options.username) {
        throw new Error('ZendeskClient - Must send username for API tokens')
      }

      const config = {
        throttle,
        username: this.options.username,
        oauth: this.options.oauth,
        token: this.options.token,
        remoteUri: this.options.remoteUri
      };
      this.sdk = ZendeskSdk.createClient(config);
    } else {
      const config = {
        throttle,
        username: '',
        oauth: this.options.oauth,
        token: this.options.token,
        remoteUri: this.options.remoteUri
      }
      this.sdk = ZendeskSdk.createClient(config);
    }
    // @ts-ignore
    this.sdk.tickets.sideLoad = ['users', 'organizations', 'metric_sets', 'comment_count', 'ticket_forms', 'brands', 'groups'];
    // @ts-ignore
    this.sdk.users.sideLoad = ['organizations', 'roles', 'abilities', 'identities', 'groups'];
    // @ts-ignore
    this.sdk.organizations.sideLoad = ['abilities'];
    // @ts-ignore
    this.sdk.groups.sideLoad = ['users'];
    // @ts-ignore
    this.sdk.ticketforms.sideLoad = ['ticket_fields'];

  }




  public listTicketFields() {
    return new Promise<any>((resolve, reject) => {
      this.sdk.ticketfields.list().then(fields => {
        resolve(fields);
      }).catch(e => reject(e))
    });
  }


  public async listTicketEventsPagedCallback(params?: {since?: Date}, callback?: any) {
    return new Promise<any>(async (resolve, reject) => {
      const observer: any = {
        error: reject,
        async next(status: any, body: any, response: any, result: any, nextPage: any) {
          if (callback) {
            await callback(body, nextPage, result?.end_time)
          }
        },
        complete(statusList: any, body: any /* , responseList, resultList */) {
          resolve(statusList)
        },
      };
      const since = Math.floor((params?.since || DEFAULT_FIRST_IMPORT_DATE).getTime() / 1000)
      // @ts-ignore
      await this.sdk.ticketevents.incrementalInclude(since, ['comment_events'], observer)
    })
  }

  public async listTicketsPagedCallback(params?: {since?: Date }, callback?: any) {
    return new Promise<any>(async (resolve, reject) => {
      const observer: any = {
        error: console.error,
        async next(status: any, body: any, response: any, result: any, nextPage: any) {
          // console.log('Next page:', nextPage);
          if (callback) {
            await callback(body, nextPage, result?.end_time)
          }
        },
        complete(statusList: any, body: any /* , responseList, resultList */) {
          resolve(statusList)
        },
      };
      const since = Math.floor((params?.since || DEFAULT_FIRST_IMPORT_DATE).getTime() / 1000)
      const result: any = await this.sdk.tickets.incrementalInclude(since, ['users', 'organizations', 'metric_sets','comment_count', 'ticket_forms', 'brands', 'groups'], observer);
    })
  }


}
