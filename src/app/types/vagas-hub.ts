import { Vaga } from './vaga';

export interface ClientVagasHub {
  client: ClientInfo;
  vagas: Vaga[];
}

export interface ClientInfo {
  id: number;
  email?: string;
  phone?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  logo_url?: string;
  clients_pf?: {
    cpf: string;
    full_name: string;
  };
  clients_pj?: {
    cnpj: string;
    company_name: string;
    trade_name?: string;
    business_segment?: string;
  };
}

export interface ClientComHub {
  id: number;
  email: string;
  vagas_hub_token?: string;
  vagas_hub_token_expires_at?: string | Date | null;
  clients_pf?: {
    full_name: string;
  };
  clients_pj?: {
    company_name: string;
    trade_name?: string;
  };
}

export interface VagaComVisibilidade extends Vaga {
  is_visible_in_hub: boolean;
}

export interface GerarHubTokenRequest {
  expires_in_days?: number;
}

export interface GerarHubTokenResponse {
  client_id: number;
  vagas_hub_token: string;
  vagas_hub_token_expires_at: string | Date | null | undefined;
  public_url: string;
}

export interface AtualizarVisibilidadeRequest {
  is_visible_in_hub: boolean;
}
