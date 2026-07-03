import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { VehicleDialog } from '../VehicleDialog';

const mockToast = jest.fn();
const mockUpdateVehicule = jest.fn().mockResolvedValue({});

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/hooks/useSites', () => ({
  useSites: () => ({ data: [{ id: 1, nom: 'Site A', ville: 'Antananarivo', pays: 'Madagascar' }] }),
}));

jest.mock('@/hooks/useVehicules', () => ({
  useCreateVehicule: () => ({ mutateAsync: jest.fn() }),
  useUpdateVehicule: () => ({ mutateAsync: mockUpdateVehicule }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// MSW server
const server = setupServer(
  http.put('http://localhost:3000/api/vehicules/:id', async ({ params, request }) => {
    const body = await request.json();
    console.log('✅ PUT reçu:', params.id, body);
    return HttpResponse.json({ id: params.id });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

test('met à jour un véhicule existant', async () => {
  const user = userEvent.setup();

  render(
    <QueryClientProvider client={new QueryClient()}>
      <VehicleDialog
        open={true}
        onOpenChange={jest.fn()}
        vehicule={{
          id: 1,
          immatriculation: 'OLD-123',
          marque: 'Peugeot',
          modele: '208',
          type: 'essence',
          capacite_reservoir: 50,
          consommation_nominale: 6.5,
          carburant_initial: 0,
          actif: true,
          site_id: 1,
        }}
      />
    </QueryClientProvider>
  );

  await user.clear(screen.getByPlaceholderText('Toyota'));
  await user.type(screen.getByPlaceholderText('Toyota'), 'Citroën');
  await user.click(screen.getByRole('button', { name: 'common.update' }));

  await waitFor(() => {
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'vehicles.updateSuccess' })
    );
  }, { timeout: 5000 });
});
