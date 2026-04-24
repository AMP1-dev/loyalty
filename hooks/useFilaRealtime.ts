import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useFilaRealtime(loja_id: string, onChange: () => void) {
  useEffect(() => {
    if (!loja_id) {
      console.log('⛔ realtime sem loja_id')
      return
    }

    console.log('📡 realtime ativo para loja:', loja_id)

    const channel = supabase
      .channel(`fila-${loja_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkins',
          filter: `loja_id=eq.${loja_id}`,
        },
        (payload) => {
          console.log('🔄 realtime disparou', payload)
          onChange()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loja_id])
}