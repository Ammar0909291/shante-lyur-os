export interface ISMSService {
  send(phone: string, message: string): Promise<void>;
  sendTemplate(phone: string, templateName: string, variables: Record<string, string>): Promise<void>;
}
