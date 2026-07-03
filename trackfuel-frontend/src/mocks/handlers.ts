import { http, HttpResponse } from 'msw';

export const handlers = [
  // ... autres handlers existants

  // Handler pour la mise à jour d’un véhicule
  http.put('http://localhost:3000/api/vehicules/:id', async ({ params, request }) => {
    const id = params.id;


    const data = (await request.json()) as Record<string, any>;
    console.log('MSW: mise à jour du véhicule', id, data);

    return HttpResponse.json({ ...data, id });
    
  }),
];
