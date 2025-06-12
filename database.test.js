const { Client } = require('pg');
const {
  /**
   * Recuperamos el esquema esperado
   *
   * Para una primer etapa, se recomienda importar la propiedad
   * "baseFields" reenombrandola a "expectedFields"
   */
  expectedFields
} = require('./schema_base')

describe('Test database', () => {
  /**
   * Variables globales usadas por diferentes tests
   */
  let client;

  /**
   * Generamos la configuracion con la base de datos y
   * hacemos la consulta sobre los datos de la tabla "users"
   *
   * Se hace en la etapa beforeAll para evitar relizar la operación
   * en cada test
   */
  beforeAll(async () => {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
  });

  /**
   * Cerramos la conexion con la base de datos
   */
  afterAll(async () => {
    await client.end();
  });

  /**
   * Validamos el esquema de la base de datos
   */
  describe('Validate database schema', () => {
    /**
     * Variable donde vamos a almacenar los campos
     * recuperados de la base de datos
     */
    let fields;
    let result;

    /**
     * Generamos un objeto para simplificar el acceso en los test
     */
    beforeAll(async () => {
      /**
       * Consulta para recuperar la información de la tabla
       * "users"
       */
      result = await client.query(
        `SELECT
          column_name, data_type
        FROM
          information_schema.columns
        WHERE
          table_name = $1::text`,
        ['users'],
      );

      fields = result.rows.reduce((acc, field) => {
        acc[field.column_name] = field.data_type;
        return acc;
      }, {});
    });

    describe('Validate fields name', () => {
      /**
       * Conjunto de tests para validar que los campos esperados se
       * encuentren presentes
       */
      test.each(expectedFields)('Validate field $name', ({ name }) => {
        expect(Object.keys(fields)).toContain(name);
      });
    });

    describe('Validate fields type', () => {
      /**
       * Conjunto de tests para validar que los campos esperados sean
       * del tipo esperado
       */
      test.each(expectedFields)('Validate field $name to be type "$type"', ({ name, type }) => {
        expect(fields[name]).toBe(type);
      });
    });
  });

  describe('Validate insertion', () => {
    afterEach(async () => {
      await client.query('TRUNCATE users');
    });

    test('Insert a valid user', async () => {
      let result = await client.query(
        `INSERT INTO
         users (email, username, birthdate, city, password)
         VALUES ('user@example.com', 'user', '2024-01-02', 'La Plata', 'root')`
      )

      expect(result.rowCount).toBe(1);

      result = await client.query(
        'SELECT * FROM users',
      );

      const user = result.rows[0];
      const userCreatedAt = new Date(user.created_at);
      const currentDate = new Date();

      expect(user.email).toBe('user@example.com');
      expect(userCreatedAt.getFullYear()).toBe(currentDate.getFullYear());
    });

    test('Insert a user with an invalid email', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city, password)
                     VALUES ('user', 'user', '2024-01-02', 'La Plata', 'root123')`

      await expect(client.query(query)).rejects.toThrow('users_email_check');
    });

    test('Insert a user with an invalid birthdate', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city)
                     VALUES ('user@example.com', 'user', 'invalid_date', 'La Plata')`;

      await expect(client.query(query)).rejects.toThrow('invalid input syntax for type date');
    });

    test('Insert a user without city', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate)
                     VALUES ('user@example.com', 'user', '2024-01-02')`;

      await expect(client.query(query)).rejects.toThrow('null value in column "city"')
    })

    // nuevos casos de prueba.
    // Se probara si la columna enable queda en false al no darle un valor

    test('Si no se pasa el campo "enabled", queda en false', async () => {
      await client.query(`
        INSERT INTO users (email, username, birthdate, city, password)
        VALUES ('enabled@demo.com', 'enabled_user', '2000-01-01', 'CABA', 'clave123')`)

      const res = await client.query(`
        SELECT enabled FROM users WHERE email = 'enabled@demo.com'
      `)

      expect(res.rows[0].enabled).toBe(false)
    })

    // Se probara si no se inserta password
    test('No se puede insertar un usuario sin password', async () => {
      const query = `
        INSERT INTO users (email, username, birthdate, city)
        VALUES ('nopass@demo.com', 'nopass_user', '2000-01-01', 'CABA')`
      await expect(client.query(query)).rejects.toThrow(/password/)
    })

    // Se creo usario y se espera que actue el default
    test('Se genera automáticamente el campo "updated_at"', async () => {
      const res = await client.query(`
        INSERT INTO users (email, username, birthdate, city, password)
        VALUES ('auto@demo.com', 'auto_user', '2000-01-01', 'CABA', 'clave123')
        RETURNING updated_at
      `)

      expect(new Date(res.rows[0].updated_at)).toBeInstanceOf(Date)
    })
  })
})
